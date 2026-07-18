/** This file encapsulates all Firebase how-to functionality and relies on Svelte state to cache how-to documents. */
import type { NotificationData } from '@components/settings/Notifications.svelte';
import { type Database, type SaveCounts, type SaveError } from '@db/Database';
import { Domain } from '@db/Domains';
import exceedsDocLimit from '@db/exceedsDocLimit';
import { firestore } from '@db/firebase';
import type Gallery from '@db/galleries/Gallery';
import { GalleriesCollection } from '@db/galleries/GalleryDatabase.svelte';
import isQuotaError from '@db/isQuotaError';
import { PreviewContentSchema } from '@db/projects/ProjectSchemas';
import SaveTracker from '@db/SaveTracker.svelte';
import supportsIndexedDB from '@db/supportsIndexedDB';
import { localeToString } from '@locale/Locale';
import { SupportedLocales } from '@locale/SupportedLocales';
import deferToIdle from '@util/deferToIdle';
import { FirebaseError } from 'firebase/app';
import {
    and,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    onSnapshot,
    or,
    query,
    updateDoc,
    where,
    writeBatch,
    type DocumentData,
    type Firestore,
    type QuerySnapshot,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { notifications } from '@db/notifications.svelte';

////////////////////////////////
// SCHEMAS
////////////////////////////////

const HowToSocialSchemaV1 = z.object({
    /** version of the schema */
    v: z.literal(1),

    /** Social interactions */
    /** Whether the creator chooses to notify subscribers when this is published */
    notifySubscribers: z.boolean(),
    /** The list of users who reacted to the how-to using each reaction */
    reactionOptions: z.record(z.string(), z.string()),
    reactions: z.record(z.string(), z.array(z.string())),
    /** The list of projects who used the how-to */
    usedByProjects: z.array(z.string()),
    /** The ID of the chat corresponding to the how-to */
    chat: z.string().nullable(),
    /** The list of users who bookmarked the how-to */
    bookmarkers: z.array(z.string()),
    /** If the how-to was submitted for the team to review for inclusion in the global Guide */
    submittedToGuide: z.boolean(),
    /** The list of users who have seen the how-to */
    seenByUsers: z.array(z.string()),
    /** The number of times that the how-to has been viewed (one user can view it multiple times, or a viewer may not be logged in) */
    viewCount: z.number(),
});

const HowToSocialSchemaLatestVersion = 1;
const HowToSocialSchema = HowToSocialSchemaV1;

export type HowToSocialDocument = z.infer<typeof HowToSocialSchema>;

const HowToSchemaV1 = z.object({
    /** Metadata */
    /** version of the schema */
    v: z.literal(1),
    /** A UUID to help with identifying how-tos */
    id: z.string(),
    /** The gallery that this how-to corresponds to */
    galleryId: z.string(),
    /** If the how-to is published */
    published: z.boolean(),
    /** Timestamp of publishing */
    publishedAt: z.number().nullable(),
    /** The coordinates of the how-to within the 2D space */
    xcoord: z.number(),
    ycoord: z.number(),

    /** Content and collaborators */
    /** The title of the how-to */
    title: z.string(),
    /** The guiding question(s) for the how-to */
    guidingQuestions: z.array(z.string()),
    /** The text of the how-to, using Wordplay markup format */
    text: z.array(z.string()),
    /** The creator of the how-to */
    creator: z.string(),
    /** The list of users who can collaborate with the creator on a how-to */
    collaborators: z.array(z.string()),
    /** The list of users who can view a how-to and interact with its social features
     * Organized as a map from gallery ID to list of user IDs, where the gallery ID is the gallery that grants the viewer access since it is a gallery by the same curator
     */
    viewers: z.record(z.string(), z.array(z.string())),
    /** Flat version of viewers, calculated in a firestore function, for firestore rule queries */
    viewersFlat: z.array(z.string()),
    /** True if the user restricts access to the how-to to only those who have direct access to the gallery
     * I.e., overwrites the gallery curator "expanding" how-to viewing permissions
     */
    scopeOverwrite: z.boolean(),
    /** Locales that the how-to depends on All ISO 639-1 languaage codes, followed by a -, followed by ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    locales: z.array(z.string()),

    /** Social content */
    social: HowToSocialSchema,
});

const HowToSchemaV2 = HowToSchemaV1.extend({
    v: z.literal(2),
    /** Whether the how-to is public or not, independent of the gallery's permissions */
    isPublic: z.boolean(),
});

/** A how-to's persisted preview is exactly the shared renderable content shape
 *  (a project preview adds a `mode` on top of this). */
const HowToPreviewSchema = PreviewContentSchema;
export type HowToPreview = z.infer<typeof HowToPreviewSchema>;

const HowToSchemaV3 = HowToSchemaV2.extend({
    v: z.literal(3),
    /** Cached preview computed by the author's browser on save, so readers skip evaluation */
    preview: HowToPreviewSchema.optional(),
});

export const HowToSchemaLatestVersion = 3;
const HowToSchema = HowToSchemaV3;

export type HowToDocument = z.infer<typeof HowToSchema>;
export type HowToUnknownVersion =
    | z.infer<typeof HowToSchemaV1>
    | z.infer<typeof HowToSchemaV2>
    | HowToDocument;

export function upgradeHowTo(howTo: HowToUnknownVersion): HowToDocument {
    switch (howTo.v) {
        case 1:
            return upgradeHowTo({ ...howTo, v: 2, isPublic: false });
        case 2:
            return upgradeHowTo({ ...howTo, v: 3 });
        case HowToSchemaLatestVersion:
            return howTo;
        default:
            throw new Error('Unexpected how-to version', howTo);
    }
}

////////////////////////////////
// APIs
////////////////////////////////

/** An immutable wrapper class for accessing and manipulating how-to data */
export default class HowTo {
    /** The data of the how-to */
    private readonly data: HowToDocument;

    constructor(data: HowToDocument) {
        this.data = data;
    }

    /**
     * Build a new HowTo from this one with the given fields overridden.
     * Always bumps `v` to the latest schema version so any save through
     * this path migrates the doc forward — old docs in Firestore catch
     * up the next time their owner edits anything.
     *
     * The `social` field merges: callers name only the social subfields
     * that actually change (e.g., `{ social: { bookmarkers: [...] } }`)
     * instead of having to spread the rest of social themselves.
     *
     * Hand the result to {@link HowToDatabase.updateHowTo} (or batch it
     * into addHowTo) to persist — HowTo itself is immutable.
     */
    withFields(
        updates: Partial<Omit<HowToDocument, 'social' | 'v'>> & {
            social?: Partial<HowToSocialDocument>;
        },
    ): HowTo {
        const { social, ...rest } = updates;
        return new HowTo({
            ...this.data,
            ...rest,
            v: HowToSchemaLatestVersion,
            social: social
                ? { ...this.data.social, ...social }
                : this.data.social,
        });
    }

    getHowToId() {
        return this.data.id;
    }

    getHowToGalleryId() {
        return this.data.galleryId;
    }

    isPublished() {
        return this.data.published;
    }

    getPublishedAt() {
        return this.data.publishedAt;
    }

    getCoordinates() {
        return [this.data.xcoord, this.data.ycoord];
    }

    inCanvasArea(xmin: number, xmax: number, ymin: number, ymax: number) {
        const buffer = 100; // extra buffer to load how-tos just outside the canvas

        return (
            this.data.xcoord >= xmin - buffer &&
            this.data.xcoord <= xmax + buffer &&
            this.data.ycoord >= ymin - buffer &&
            this.data.ycoord <= ymax + buffer
        );
    }

    getTitle() {
        return this.data.title;
    }

    getTitleAsMap(): SvelteMap<string, string> {
        return HowTo.markupToMapHelper(this.data.title);
    }

    /** Get the title of the how-to in the specified locale. If there is no title written in that language, fall back to the first title */
    getTitleInLocale(locale: string): string {
        return HowTo.titleInLocale(
            this.data.title,
            locale,
            this.getLocales()[0],
        );
    }

    static titleInLocale(
        title: string,
        locale: string,
        backupLocale: string,
    ): string {
        const titleMap = HowTo.markupToMapHelper(title);
        let nameInLocale: string | undefined = titleMap.get(locale);
        if (nameInLocale) return nameInLocale;

        let nameInBackupLocale: string | undefined = titleMap.get(backupLocale);
        if (nameInBackupLocale) return nameInBackupLocale;
        else return ''; // fall back to an empty title
    }

    getGuidingQuestions() {
        return this.data.guidingQuestions;
    }

    getText() {
        return this.data.text;
    }

    /** Get text in the specified locale. If no text is available for that locale, fall back to the first locale */
    getTextInLocale(locale: string): string[] {
        if (!this.getLocales().includes(locale)) {
            locale = this.getLocales()[0]; // fall back to the first locale if the requested one isn't available
        }

        return this.data.text.map((text: string) => {
            let map = HowTo.markupToMapHelper(text);
            let textInLocale: string | undefined = map.get(locale);
            if (textInLocale) return textInLocale;
            else return '';
        });
    }

    static markupToMapHelper(markup: string): SvelteMap<string, string> {
        // input format: '¶hello¶/en-US¶hola¶/es-MX'
        // output format: {'en-US': 'hello', 'es-MX': 'hola'}
        let map: SvelteMap<string, string> = new SvelteMap<string, string>();

        // should match strings in the format of "¶some text¶/locale", where the locale is one of the supported locales
        // necessary, since not all locales match the {2,3}-{2,3} format (e.g., ta-IN-LK-SG)
        let regexString: string =
            '¶(.*?)¶\/(' + SupportedLocales.join('|') + ')';
        let regex: RegExp = new RegExp(regexString, 'gs');

        let stringAndLocale: RegExpExecArray[] = [...markup.matchAll(regex)];

        // dealing with cases of no markup, just text (i.e., how-to was created before translation was implemented)
        // 'en-US' was the hard-coded default locale, so we just use that
        if (stringAndLocale.length === 0) {
            map.set('en-US', markup);
        } else {
            stringAndLocale.forEach((match) => {
                let locale: string = match[2];
                let text: string = match[1];

                map.set(locale, text);
            });
        }

        return map;
    }

    getCreator() {
        return this.data.creator;
    }

    getCollaborators() {
        return this.data.collaborators;
    }

    isCreatorCollaborator(userId: string) {
        return (
            this.data.creator === userId ||
            this.data.collaborators.includes(userId)
        );
    }

    getViewers() {
        return this.data.viewersFlat;
    }

    hasViewer(userId: string) {
        return this.data.viewersFlat.includes(userId);
    }

    getLocales(): string[] {
        return this.data.locales;
    }

    isPublic(): boolean {
        return this.data.isPublic;
    }

    getSocial() {
        return this.data.social;
    }

    getNotifySubscribers() {
        return this.data.social.notifySubscribers;
    }

    getReactionOptions() {
        return this.data.social.reactionOptions;
    }

    getReactions() {
        return this.data.social.reactions;
    }

    getNumReactions(reaction: string) {
        return this.data.social.reactions[reaction]?.length || 0;
    }

    didUserReact(userId: string, reaction: string) {
        return this.data.social.reactions[reaction]?.includes(userId) || false;
    }

    getUsedByProjects() {
        return this.data.social.usedByProjects;
    }

    getChatId() {
        return this.data.social.chat;
    }

    getBookmarkers() {
        return this.data.social.bookmarkers;
    }

    hasBookmarker(userId: string) {
        return this.data.social.bookmarkers.includes(userId);
    }

    getSubmittedToGuide() {
        return this.data.social.submittedToGuide;
    }

    getSeenByUsers() {
        return this.data.social.seenByUsers;
    }

    getViewCount() {
        return this.data.social.viewCount;
    }

    getScopeOverwrite() {
        return this.data.scopeOverwrite;
    }

    getPreview(): HowToPreview | undefined {
        return this.data.preview;
    }

    withPreview(preview: HowToPreview): HowTo {
        return new HowTo({ ...this.data, preview });
    }

    getData() {
        const data = { ...this.data };
        if (data.preview === undefined) delete data.preview;
        return data;
    }
}

////////////////////////////////
// CACHE
////////////////////////////////

export const HowTosCollection = Domain.HowTos;

export class HowToDatabase {
    private readonly db: Database;

    /** This is a global reactive map that stores howtos obtained from Firestore */
    private readonly howtos = $state(new SvelteMap<string, HowTo>());

    /** All of the how-tos that the user can edit (as a creator or collaborator) */
    readonly allEditableHowTos: HowTo[] = $derived([
        ...Array.from(this.howtos.values()).filter((howto) => {
            const user = this.db.getUser();
            if (user === null) return false;
            return howto.isCreatorCollaborator(user.uid);
        }),
    ]);

    /** All of the how-tos that the user has view or write access to (basically the values of howtos) */
    readonly allAccessiblePublishedHowTos: HowTo[] = $derived([
        ...Array.from(this.howtos.values()).filter((ht) => ht.isPublished()),
    ]);

    /** Maps how-to IDs to listeners that need to be notified when a change is made to the how-to */
    private listeners = new Map<string, Set<(howTo: HowTo) => void>>();

    private unsubscribes: Unsubscribe[] = [];

    /** Cancels a pending idle-deferred `listen()` (see `listen`/`ignore`). */
    private listenDefer: (() => void) | undefined = undefined;

    /** Per-listener tracking of how-to IDs currently visible to that listener.
     *  Key is the listener identity ("own", "scope", or `gallery:<chunkIndex>`).
     *  Used to garbage-collect cache entries that no listener sees anymore. */
    private listenerDocIds: Map<string, Set<string>> = new Map();

    /** Dedup set so a how-to surfaced by multiple listeners only notifies once. */
    private notifiedHowToIds: Set<string> = new Set();

    /** Whether this is a browser with IndexedDB support. */
    readonly IndexedDBSupported = supportsIndexedDB();

    /** Flips true once `howtos` has been populated from the local cache (or
     *  immediately, when there's no IndexedDB). */
    hydrated: boolean = $state(false);

    /** Per-item cloud-save tracking (unsaved set, errors, counts, durable dirty
     *  rows), shared with the other domain facades. See {@link SaveTracker}. */
    private readonly saves = new SaveTracker({
        domain: Domain.HowTos,
        localDB: () => this.db.localDB,
        track: (write) => this.db.track(write),
        deviceCount: () => this.allEditableHowTos.length,
        supported: () => this.IndexedDBSupported,
        isHydrated: () => this.hydrated,
        onStorageFull: () =>
            this.db.reportBanner((l) => l.ui.banner.storageFull),
    });

    /** IDs of the user's how-tos whose latest local edit hasn't been confirmed
     *  saved in the cloud (write pending or failed). */
    get unsavedIDs() {
        return this.saves.unsavedIDs;
    }

    /** Save failures for the save-status dialog. */
    get saveErrors(): SaveError[] {
        return this.saves.saveErrors;
    }

    /** How many of the user's editable how-tos are saved on this device, in the
     *  cloud, and unsaved. */
    get saveCounts(): SaveCounts {
        return this.saves.saveCounts;
    }

    constructor(db: Database) {
        this.db = db;

        // Warm `howtos` from the local cache before any cloud sync.
        this.hydrate();
    }

    /** Wrap a cloud write so the save-status dialog reflects it; see
     *  {@link SaveTracker.trackSave}. */
    private trackSave(
        id: string,
        name: string | undefined,
        write: Promise<unknown>,
    ): Promise<boolean> {
        return this.saves.trackSave(id, name, write);
    }

    /** Re-attempt the cloud write for every how-to still marked unsaved (e.g.
     *  edits made offline before a reload). Called once the user is known
     *  (startSync) and on reconnect. A no-op when nothing is unsaved. */
    async flushUnsaved() {
        if (firestore === undefined) return;
        const db = firestore;
        await this.saves.flushUnsaved((id) => {
            const howTo = this.howtos.get(id);
            if (howTo === undefined) return undefined;
            // Replay as a create-or-overwrite, mirroring addHowTo: the original
            // write may never have reached the server (its doc is `not-found`),
            // so updateDoc would fail forever. set() creates-or-overwrites, and
            // the idempotent arrayUnion re-links it to its gallery's `howTos`
            // (a no-op when it's already linked, as on a plain edit replay).
            const batch = writeBatch(db);
            batch.set(doc(db, HowTosCollection, id), howTo.getData());
            batch.update(
                doc(db, GalleriesCollection, howTo.getHowToGalleryId()),
                { howTos: arrayUnion(id) },
            );
            return { name: howTo.getTitle(), write: batch.commit() };
        });
    }

    /** Populate `howtos` from the shared local cache, ONCE. Unlike the other
     *  domains we do NOT keep a live subscription: the three cloud listeners
     *  garbage-collect `howtos` (an entry survives only while some listener sees
     *  it), and a permanent cache subscription would fight that GC — re-adding
     *  entries the GC just pruned. After this one-shot read the cloud listeners
     *  own how-to state for the rest of the session; the cache is written for
     *  the NEXT cold start. Offline (no listeners fire, no GC) the hydrated
     *  entries simply remain. */
    async hydrate() {
        if (!this.IndexedDBSupported) {
            this.hydrated = true;
            return;
        }
        // Seed the in-memory unsaved set from the durable dirty table BEFORE the
        // cloud listeners run, so the skip-dirty guard preserves local edits
        // that haven't reached the cloud yet.
        await this.saves.seedDirty();
        let done = false;
        const subscription = this.db.localDB
            .getAllHowTos()
            .subscribe((howtos) => {
                if (done) return;
                done = true;
                for (const howto of howtos) this.loadHowToIntoMemory(howto);
                // Reconcile the dirty set against what actually loaded: a dirty
                // id with no cached content can't be replayed (e.g. a how-to
                // whose content never got cached), so clear the stale flag
                // rather than leave it perpetually "unsaved" and unflushable.
                for (const id of Array.from(this.unsavedIDs))
                    if (!this.howtos.has(id)) this.saves.forget(id);
                this.hydrated = true;
                subscription.unsubscribe();
            });
    }

    /** Insert a cached how-to into the in-memory map without persisting or
     *  writing back to the cache. */
    private loadHowToIntoMemory(serialized: HowToDocument) {
        this.howtos.set(serialized.id, new HowTo(serialized));
    }

    /** Mirror authoritative how-tos into the local cache for cold-start
     *  hydration. Never prunes (the snapshot GC manages in-memory coherence;
     *  explicit deletes remove from the cache) and is never called from the
     *  hydrate path. */
    private async cacheHowTosLocally(howtos: HowTo[]) {
        if (!this.IndexedDBSupported || howtos.length === 0) return;
        try {
            // $state.snapshot strips any Svelte reactive proxies (e.g. arrays
            // passed in from the how-to form's state) to plain values —
            // IndexedDB's structured clone throws DataCloneError on a proxy.
            // Await so a rejected write (e.g. full storage) is caught; this
            // mirrors cloud data, so surface a transient banner, not data loss.
            await this.db.localDB.saveHowTos(
                howtos.map((h) => $state.snapshot(h.getData())),
            );
        } catch (error) {
            if (isQuotaError(error))
                this.db.reportBanner((l) => l.ui.banner.storageFull, error);
            else console.error(error);
        }
    }

    /** Clear the local how-to cache and in-memory map. Used on account-switch
     *  and explicit sign-out, mirroring Projects' local wipe. */
    async clearLocal() {
        this.howtos.clear();
        await this.saves.clearTracking();
        if (this.IndexedDBSupported) await this.db.localDB.deleteAllHowTos();
    }

    async updateHowTo(howTo: HowTo, persist: boolean) {
        const howToID = howTo.getHowToId();

        // if published as a result of this update, then set publishedAt time
        if (howTo.isPublished() && howTo.getPublishedAt() === null) {
            howTo = new HowTo({
                ...howTo.getData(),
                publishedAt: Date.now(),
            });
        }

        // set the revised how-to in the local state, propogating updates
        this.howtos.set(howToID, howTo);

        // notify the listeners for this how-to
        this.listeners.get(howToID)?.forEach((listener) => {
            listener(howTo);
        });

        // if asked to persist, mirror to the local cache and update remotely
        if (persist && firestore) {
            // Refuse a write that would exceed Firestore's 1 MiB document
            // limit, surfacing a banner rather than an opaque cloud rejection.
            if (exceedsDocLimit(howTo.getData())) {
                this.db.reportBanner((l) => l.ui.banner.saveTooLarge);
                return;
            }
            this.cacheHowTosLocally([howTo]);
            await this.trackSave(
                howToID,
                howTo.getTitle(),
                updateDoc(
                    doc(firestore, HowTosCollection, howToID),
                    howTo.getData(),
                ),
            );
        }
    }

    async setAutoPreview(
        howToId: string,
        preview: HowToPreview,
    ): Promise<void> {
        if (!firestore) return;
        const howTo = this.howtos.get(howToId);
        if (!howTo) return;
        this.howtos.set(howToId, howTo.withPreview(preview));
        await this.trackSave(
            howToId,
            howTo.getTitle(),
            updateDoc(doc(firestore, HowTosCollection, howToId), { preview }),
        );
    }

    /** Delete a how-to. Returns whether it succeeded so callers can gate UI
     *  (e.g. closing the editor) on a confirmed delete rather than assuming it
     *  worked. Confirm-then-remove: do the cloud delete FIRST and only drop
     *  local state (memory, cache, and the durable dirty row via forget) once it
     *  lands. Removing local state first — as this used to — meant a
     *  failed/offline delete left a stranded cloud copy with the dirty row
     *  already cleared, so nothing could retry it. write() fails fast. */
    async deleteHowTo(howToId: string, gallery: Gallery): Promise<boolean> {
        if (firestore) {
            try {
                // Atomic batch: delete the how-to doc AND remove its ID from
                // the gallery's `howTos` array in a single operation, using
                // arrayRemove so concurrent curator edits don't clobber each
                // other.
                const batch = writeBatch(firestore);
                batch.delete(doc(firestore, HowTosCollection, howToId));
                batch.update(
                    doc(firestore, GalleriesCollection, gallery.getID()),
                    { howTos: arrayRemove(howToId) },
                );
                await this.db.write(batch.commit());
            } catch (err) {
                this.db.reportBanner((l) => l.ui.banner.deleteFailed, err);
                return false;
            }
        }

        // Cloud delete succeeded (or we're in local-only mode with no
        // firestore): now remove locally.
        this.howtos.delete(howToId);
        this.saves.forget(howToId);
        if (this.IndexedDBSupported) void this.db.localDB.deleteHowTo(howToId);
        return true;
    }

    syncUser() {
        // if there is no firestore access, do nothing
        if (firestore === undefined) return;

        // No user (logout)? Tear the listeners down — otherwise they keep
        // running after auth clears and error with permission-denied.
        const user = this.db.getUser();
        if (!user) {
            this.ignore();
            return;
        }

        this.listen(firestore, user.uid);
    }

    async addHowTo(
        gallery: Gallery,
        published: boolean,
        xcoord: number,
        ycoord: number,
        collaborators: string[],
        title: string,
        guidingQuestions: string[],
        text: string[],
        locales: string[],
        reactionTypes: Record<string, string>,
        notify: boolean,
        overwriteAccessScope: boolean,
        isPublic: boolean,
    ): Promise<HowTo | undefined | false> {
        if (firestore === undefined) return undefined;
        const user = this.db.getUser()?.uid;
        if (user === null) return undefined;

        // create a new social interaction document
        const newHowToSocial: HowToSocialDocument = {
            v: HowToSocialSchemaLatestVersion,
            notifySubscribers: notify,
            reactionOptions: reactionTypes,
            reactions: Object.fromEntries(
                new Map<string, string[]>(
                    Object.keys(reactionTypes).map((emoji) => [emoji, []]),
                ),
            ),
            usedByProjects: [],
            chat: null,
            bookmarkers: [],
            submittedToGuide: false,
            seenByUsers: [user as string],
            viewCount: 0,
        };

        // create a new how-to
        const newHowTo: HowToDocument = {
            v: HowToSchemaLatestVersion,
            id: uuidv4(),
            galleryId: gallery.getID(),
            published: published, // defaults to false
            publishedAt: published ? Date.now() : null,
            xcoord: xcoord,
            ycoord: ycoord,
            title: title,
            guidingQuestions: guidingQuestions,
            text: text,
            creator: user as string,
            collaborators: collaborators,
            viewers: {} as Record<string, string[]>,
            viewersFlat: [] as string[],
            scopeOverwrite: overwriteAccessScope,
            locales: locales,
            isPublic: isPublic,
            social: newHowToSocial,
        };

        // Refuse a how-to that would exceed Firestore's 1 MiB document limit.
        if (exceedsDocLimit(newHowTo)) {
            this.db.reportBanner((l) => l.ui.banner.saveTooLarge);
            return undefined;
        }

        // Add the how-to to Firebase, relying on the realtime listener to update the local cache.
        try {
            // Atomic batch: create the how-to doc AND append its ID to the
            // gallery's `howTos` array in a single operation. arrayUnion lets
            // concurrent curators add how-tos to the same gallery without
            // overwriting each other.
            const batch = writeBatch(firestore);
            batch.set(doc(firestore, HowTosCollection, newHowTo.id), newHowTo);
            batch.update(doc(firestore, GalleriesCollection, gallery.getID()), {
                howTos: arrayUnion(newHowTo.id),
            });

            // Mirror the new how-to in the local cache first so the UI sees it
            // right away, then save to the cloud, tracking save state.
            const howTo = new HowTo(newHowTo);
            await this.updateHowTo(howTo, false);
            this.cacheHowTosLocally([howTo]);
            // Fire-and-forget the cloud write. The local mirror above already
            // holds the how-to, and trackSave's durable dirty flag replays the
            // create on reconnect — so awaiting batch.commit() here buys no
            // durability and would hang the create form on a poor/offline
            // connection (a Firestore write promise resolves only on server
            // ack, never while offline). Matches projects/characters, whose
            // editors never block on the cloud write.
            void this.trackSave(newHowTo.id, howTo.getTitle(), batch.commit());
        } catch (error) {
            console.error(error);
            return undefined;
        }

        return this.getHowTo(newHowTo.id);
    }

    async getHowTo(howToId: string): Promise<HowTo | undefined | false> {
        // do we have the how-to cached? return it.
        const howTo = this.howtos.get(howToId);
        if (howTo) return howTo;

        // if not, see if it's in the database
        if (firestore === undefined) return undefined;
        try {
            const howToDoc = await this.db.read(
                getDoc(doc(firestore, HowTosCollection, howToId)),
            );

            if (howToDoc.exists()) {
                const remoteHowTo = howToDoc.data();
                if (remoteHowTo === undefined) return undefined;

                const newHowTo = new HowTo(
                    upgradeHowTo(remoteHowTo as HowToUnknownVersion),
                );
                // Update the doc locally but do not persist, we already know it's in the database
                this.updateHowTo(newHowTo, false);

                return newHowTo;
            } else return undefined;
        } catch (error) {
            return false;
        }
    }

    async getHowTos(howToIds: string[]): Promise<HowTo[]> {
        const results = await Promise.all(
            howToIds.map((id) => this.getHowTo(id)),
        );
        return results.filter(
            (ht): ht is HowTo => ht !== undefined && ht !== false,
        );
    }

    ignore() {
        if (this.listenDefer) {
            this.listenDefer();
            this.listenDefer = undefined;
        }
        this.unsubscribes.forEach((u) => u());
        this.unsubscribes = [];
        this.listenerDocIds.clear();
        this.notifiedHowToIds.clear();
    }

    listen(firestore: Firestore, userId: string) {
        this.ignore();

        // Defer these background listeners until the browser is idle so they
        // don't compete with the critical galleries/projects load on login.
        this.listenDefer = deferToIdle(() => {
            this.listenDefer = undefined;
            // The user may have signed out or switched during the idle gap.
            if (this.db.getUser()?.uid !== userId) return;
            this.startListening(firestore, userId);
        });
    }

    private startListening(firestore: Firestore, userId: string) {
        this.db.markSyncing(Domain.HowTos);

        // Notifications only fire for how-tos published after this point in time.
        const startTime: number = Date.now();

        // Listener 1: how-tos where the user is creator or collaborator.
        const ownQuery = query(
            collection(firestore, HowTosCollection),
            or(
                where('creator', '==', userId),
                where('collaborators', 'array-contains', userId),
            ),
        );
        this.unsubscribes.push(
            onSnapshot(
                ownQuery,
                (snapshot) => this.handleSnapshot('own', snapshot, startTime),
                (error) => this.logFirebaseError(error),
            ),
        );

        // Listener 2: published how-tos in any of the user's editor/curator galleries.
        // Chunked into groups of 30 because Firestore caps `in` at 30 values.
        // The `published == true` filter is required: the security rules only grant
        // gallery curators/collaborators read access to *published* how-tos (see the
        // read rule in firestore.rules). Other creators' unpublished drafts in these
        // galleries are not readable, and because Firestore rejects an entire query if
        // any matched doc is denied, omitting this filter triggers permission-denied.
        // The user's own drafts in these galleries are still covered by Listener 1.
        const editorGalleryIds = Array.from(
            this.db.Galleries.accessibleGalleries.keys(),
        );
        for (let i = 0; i < editorGalleryIds.length; i += 30) {
            const chunk = editorGalleryIds.slice(i, i + 30);
            const key = `gallery:${i / 30}`;
            const galleryQuery = query(
                collection(firestore, HowTosCollection),
                where('galleryId', 'in', chunk),
                where('published', '==', true),
            );
            this.unsubscribes.push(
                onSnapshot(
                    galleryQuery,
                    (snapshot) => this.handleSnapshot(key, snapshot, startTime),
                    (error) => this.logFirebaseError(error),
                ),
            );
        }

        // Listener 3: published how-tos visible via expanded scope.
        const scopeQuery = query(
            collection(firestore, HowTosCollection),
            and(
                where('published', '==', true),
                where('scopeOverwrite', '==', false),
                where('viewersFlat', 'array-contains', userId),
            ),
        );
        this.unsubscribes.push(
            onSnapshot(
                scopeQuery,
                (snapshot) => this.handleSnapshot('scope', snapshot, startTime),
                (error) => this.logFirebaseError(error),
            ),
        );
    }

    private handleSnapshot(
        key: string,
        snapshot: QuerySnapshot<DocumentData>,
        startTime: number,
    ) {
        // (a) Parse, upgrade, and cache every doc this listener saw.
        //     Track the IDs so we can garbage-collect later.
        const seen = new Set<string>();
        const synced: HowTo[] = [];
        snapshot.forEach((doc) => {
            const howto = doc.data();
            seen.add(doc.id);
            // Keep it in `seen` (so GC doesn't prune our own how-to), but skip
            // applying/caching it while it has unsaved local edits not yet
            // pushed — our local copy is authoritative until flushUnsaved
            // replays it.
            if (this.unsavedIDs.has(doc.id)) return;
            try {
                const upgraded: HowToDocument = upgradeHowTo(
                    howto as HowToUnknownVersion,
                );
                HowToSchema.parse(upgraded);
                const howTo = new HowTo(upgraded);
                this.updateHowTo(howTo, false);
                synced.push(howTo);
            } catch (error) {
                console.error(error);
            }
        });
        this.listenerDocIds.set(key, seen);

        // Mirror this listener's cloud truth into the local cache for next cold
        // start. (We intentionally don't prune the cache here — see hydrate.)
        this.cacheHowTosLocally(synced);

        // (b) Notifications for newly-added published how-tos, deduped across listeners.
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                const id = change.doc.id;
                if (
                    !this.notifiedHowToIds.has(id) &&
                    data.published &&
                    data.publishedAt !== null &&
                    data.publishedAt >= startTime &&
                    data.social.notifySubscribers === true
                ) {
                    this.notifiedHowToIds.add(id);
                    notifications.set(id + 'howto', {
                        title: HowTo.titleInLocale(
                            data.title,
                            localeToString(this.db.Locales.getLocale()),
                            (data.locales as string[])[0],
                        ),
                        galleryID: data.galleryId,
                        itemID: id,
                        type: 'howto',
                    } as NotificationData);
                }
            }
        });

        // (c) Cache GC: a doc should remain cached iff at least one listener still sees it.
        //     Safe on initial load — listeners that haven't fired yet have no entry in
        //     listenerDocIds, so the union only includes IDs we've actually loaded.
        const union = new Set<string>();
        for (const ids of this.listenerDocIds.values())
            for (const id of ids) union.add(id);

        for (const cachedId of this.howtos.keys()) {
            // Keep how-tos with unsaved local edits even if no listener sees
            // them (they aren't on the server yet) — pruning them would drop the
            // only copy and leave nothing for flushUnsaved to replay.
            if (!union.has(cachedId) && !this.unsavedIDs.has(cachedId))
                this.howtos.delete(cachedId);
        }

        this.db.markSynced(Domain.HowTos, this.howtos.size);
    }

    private logFirebaseError(error: unknown) {
        // Always terminal so the save-status button stops spinning and the
        // dialog shows "failed" (incl. permission/index errors); only
        // connectivity errors flip the offline/unreachable state.
        this.db.markSyncFailed(Domain.HowTos);
        if (this.db.isConnectivityError(error)) this.db.markFirebaseFailed();
        if (error instanceof FirebaseError) {
            console.error(error.code);
            console.error(error.message);
        }
    }

    addListener(howToId: string, listener: (howTo: HowTo) => void) {
        const current = this.listeners.get(howToId);

        if (current) current.add(listener);
        else this.listeners.set(howToId, new Set([listener]));
    }

    ignoreListener(howToId: string, listener: (howTo: HowTo) => void) {
        const current = this.listeners.get(howToId);

        if (current) current.delete(listener);
    }
}
