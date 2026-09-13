/** This file encapsulates all Firebase how-to functionality and relies on Svelte state to cache how-to documents. */
import { type Database, type SaveCounts, type SaveError } from '@db/Database';
import { Domain } from '@db/Domains';
import exceedsDocLimit from '@db/exceedsDocLimit';
import { firestore } from '@db/firebase';
import { GALLERY_CHUNK_SIZE } from '@db/firestoreLimits';
import Watchers from '@db/Watchers';
import type { PublicWatchState } from '@db/galleries/GalleryDatabase.svelte';
import { canCreateHowTo } from '@db/howtos/howToAccess';
import type Gallery from '@db/galleries/Gallery';

import isQuotaError from '@db/isQuotaError';
import { PreviewContentSchema } from '@db/projects/ProjectSchemas';
import SaveTracker, { type RePush } from '@db/SaveTracker.svelte';
import { type HowToFieldSet } from '@db/rulesFields';
import supportsIndexedDB from '@db/supportsIndexedDB';
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

/**
 * `viewers`/`viewersFlat` are gone: they claimed to be maintained by a cloud
 * function and nothing anywhere ever wrote them, so the rule and the query that
 * read them matched nobody and expanded access did not work (#907). Who may view
 * a how-to through expanded scope is a grant on the *gallery*, and is read from
 * there now.
 *
 * No version bump is needed to drop them, and none of the three versions
 * declares them any more. `HowToSchema.parse` runs in zod's default strip mode
 * and its result is discarded — `new HowTo()` takes the pre-parse object — so a
 * stored document still carrying the fields validates, and nothing re-persists a
 * stripped value.
 */
const HowToSchemaV3 = HowToSchemaV2.extend({
    v: z.literal(3),
    /** Cached preview computed by the author's browser on save, so readers skip evaluation */
    preview: HowToPreviewSchema.exactOptional(),
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

/** Key prefix for the per-gallery public watch, distinguishing it from the three
 *  uid-scoped listeners wherever a listener's identity decides something. */
export const PublicListenerPrefix = 'public:';

/**
 * How long a public watch waits for its first snapshot before asking for the
 * gallery's how-tos one document at a time instead.
 *
 * Long enough that a healthy cold connection has delivered first — otherwise
 * every ordinary page load pays for the documents twice, which is the cost this
 * watch exists to avoid. Short enough to be well inside the patience of someone
 * who just opened the page.
 */
export const FirstFallbackDelay = 3_000;

/** Where the doubling stops. A wedged stream never recovers on its own, so the
 *  asking must not stop either — but it should settle into a slow heartbeat
 *  rather than keep reading at the rate it started. */
export const MaxFallbackDelay = 10_000;

/**
 * How one gallery's how-tos reach the cache, and therefore what it costs.
 *
 * Exactly one of these per watched gallery: a watch *and* a read-through would
 * bill every document twice on a cold load, which is the whole reason this is a
 * decision rather than a pair of things that both run.
 */
export type GalleryWatchMode =
    /** The uid-scoped listeners already deliver everything here. Nothing to do. */
    | 'covered'
    /** A public gallery: one query delivers every how-to the rules admit. */
    | 'public'
    /** Neither — a moderator, or a member whose listeners are off. Read the
     *  gallery's own list of how-tos, one document at a time. */
    | 'readthrough';

/** Gallery IDs split into `where('galleryId','in',...)`-sized batches. */
function chunkGalleries(ids: string[]): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += GALLERY_CHUNK_SIZE)
        chunks.push(ids.slice(i, i + GALLERY_CHUNK_SIZE));
    return chunks;
}

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

    /** Ref-counted per-gallery watches, acquired through
     *  `GalleryDatabase.watchPublic`. */
    private readonly galleryWatchers = new Watchers();

    /** What each live gallery watch decided to do, so a re-evaluation restarts
     *  only the watches whose answer actually moved. */
    private readonly watchModes = new Map<string, GalleryWatchMode>();

    /** What each public how-to watch is doing, so a refusal is distinguishable
     *  from an empty space. */
    readonly publicWatchState: SvelteMap<string, PublicWatchState> =
        new SvelteMap();

    /** Whether the three uid-scoped listeners are currently subscribed. Not the
     *  same question as "is anyone signed in": the how-to notifications setting
     *  tears them down too, and a member in that state still needs a way to read
     *  a public gallery. */
    private userListenersRunning = false;

    /** One-shot reads still in flight, by how-to ID, so surfaces that ask for
     *  the same document at the same moment share one request. */
    private readonly reading = new Map<
        string,
        Promise<HowTo | undefined | false>
    >();

    /** Maps how-to IDs to listeners that need to be notified when a change is made to the how-to */
    private listeners = new Map<string, Set<(howTo: HowTo) => void>>();

    private unsubscribes: Unsubscribe[] = [];

    /** Cancels a pending idle-deferred `listen()` (see `listen`/`ignore`). */
    private listenDefer: (() => void) | undefined = undefined;

    /** Per-listener tracking of how-to IDs currently visible to that listener.
     *  Key is the listener identity ("own", "scope", or `gallery:<chunkIndex>`).
     *  Used to garbage-collect cache entries that no listener sees anymore. */
    private listenerDocIds: Map<string, Set<string>> = new Map();

    /** The gallery IDs the current listeners were built from, sorted and joined,
     *  so a gallery edit that changes no membership re-subscribes nothing. */
    private watchedGalleryKey: string | undefined = undefined;

    /** Which listeners must have reported before the cache GC may run. Without
     *  it, a re-subscribe empties `listenerDocIds` while the cache is still full,
     *  and whichever listener answers first evicts everything the others hold.
     *
     *  A set of keys rather than a count, because a listener can now start and
     *  stop on navigation: counted, a public gallery watch would make GC eligible
     *  for a visitor who has no other listener; uncounted, the sizes would never
     *  agree again and GC would stop running for everyone. */
    private readonly expectedListenerKeys = new Set<string>();

    /** How-tos that entered the cache through a one-shot read rather than a
     *  listener — a `?id=` deep link, or a gallery no listener covers.
     *
     *  The invariant this keeps: **garbage collection may only evict what a
     *  listener put in the cache.** An id leaves this set as soon as a listener
     *  reports it, so a how-to a listener owns is collectable normally. */
    private readonly directReadIDs = new Set<string>();

    /** Dedup set so a how-to surfaced by multiple listeners only notifies once. */

    /** Whether this is a browser with IndexedDB support. */
    readonly IndexedDBSupported = supportsIndexedDB();

    /** Flips true once `howtos` has been populated from the local cache (or
     *  immediately, when there's no IndexedDB). */
    hydrated: boolean = $state(false);

    /** Per-item cloud-save tracking (unsaved set, errors, counts, durable dirty
     *  rows), shared with the other domain facades. See {@link SaveTracker}. */
    private readonly saves = new SaveTracker({
        domain: Domain.HowTos,
        rePush: (id) => this.rePush(id),
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

    /** Whether this device's copy should still win over the cloud's; see
     *  {@link SaveTracker.isLocallyAuthoritative}. */
    isLocallyAuthoritative(id: string): boolean {
        return this.saves.isLocallyAuthoritative(id);
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
        await this.saves.flushUnsaved();
    }

    /** Build a fresh cloud write for one how-to; see {@link SaveTrackerHost}.
     *  Replay as a create-or-overwrite, mirroring addHowTo: the original write
     *  may never have reached the server (its doc is `not-found`), so updateDoc
     *  would fail forever. set() creates-or-overwrites, and the idempotent
     *  arrayUnion re-links it to its gallery's `howTos` (a no-op when it's
     *  already linked, as on a plain edit replay). */
    private rePush(id: string): RePush {
        if (firestore === undefined) return undefined;
        const db = firestore;
        const howTo = this.howtos.get(id);
        if (howTo === undefined) return undefined;
        const batch = writeBatch(db);
        batch.set(doc(db, HowTosCollection, id), howTo.getData());
        batch.update(doc(db, Domain.Galleries, howTo.getHowToGalleryId()), {
            howTos: arrayUnion(id),
        });
        return { name: howTo.getTitle(), write: batch.commit() };
    }

    /** Populate `howtos` from the shared local cache, ONCE. Unlike the other
     *  domains we do NOT keep a live subscription: the cloud listeners
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

    async updateHowTo(howTo: HowTo, persist: boolean, fields?: HowToFieldSet) {
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
            const data = howTo.getData();
            await this.trackSave(
                howToID,
                howTo.getTitle(),
                updateDoc(
                    doc(firestore, HowTosCollection, howToID),
                    fields === undefined
                        ? data
                        : Object.fromEntries(
                              fields.map((field) => [field, data[field]]),
                          ),
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
        // The conversation about it goes first, and awaited, for the reason the
        // project delete path gives: the chat rules read the how-to to check
        // that whoever is deleting may, so deleting the how-to first leaves
        // nothing to check against and strands the chat — and with it the
        // `translations` subcollection only the `chatDeleted` trigger collects
        // (#1353). Stop if it fails rather than deleting the how-to anyway,
        // which is the state that has no way back.
        if (this.howtos.get(howToId)?.getChatId() != null) {
            if (!(await this.db.Chats.deleteChat(howToId))) return false;
        }

        if (firestore) {
            try {
                // Atomic batch: delete the how-to doc AND remove its ID from
                // the gallery's `howTos` array in a single operation, using
                // arrayRemove so concurrent curator edits don't clobber each
                // other.
                const batch = writeBatch(firestore);
                batch.delete(doc(firestore, HowTosCollection, howToId));
                batch.update(
                    doc(firestore, Domain.Galleries, gallery.getID()),
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
        // Confirmed above, so the arrayRemove has landed.
        this.db.Galleries.mirrorHowToMembership(gallery, howToId, false);
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
            // `clearLocal` empties the cache on sign-out, and a live listener
            // will not re-deliver on its own — nothing changed on the server.
            // Re-subscribing is what forces the full snapshot back.
            this.galleryWatchers.restart();
            return;
        }

        this.listen(firestore, user.uid);
        this.galleryWatchers.restart();
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
            batch.update(doc(firestore, Domain.Galleries, gallery.getID()), {
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
            void this.trackSave(
                newHowTo.id,
                howTo.getTitle(),
                batch.commit(),
            ).then((saved) => {
                // Once it lands, so the drafts list doesn't wait on a snapshot
                // for a membership we already wrote.
                if (saved)
                    this.db.Galleries.mirrorHowToMembership(
                        gallery,
                        newHowTo.id,
                        true,
                    );
            });
        } catch (error) {
            console.error(error);
            return undefined;
        }

        return this.getHowTo(newHowTo.id);
    }

    /** The how-to, `undefined` for "there isn't one here for you", or `false`
     *  for "we never got an answer" — only the second is worth asking again
     *  about. A denied read is `undefined`: whether it exists is not ours to
     *  reveal. */
    async getHowTo(howToId: string): Promise<HowTo | undefined | false> {
        // do we have the how-to cached? return it.
        const howTo = this.howtos.get(howToId);
        if (howTo) return howTo;

        // No backend at all means we never got to look, not that it's absent.
        if (firestore === undefined) return false;

        // Several surfaces ask for one gallery's how-tos at the same moment on a
        // cold cache — the canvas, the docs tile, the project's concept index,
        // the gallery tile — and each miss would otherwise be its own billed
        // read of the same document. Share whatever is already in flight.
        const inFlight = this.reading.get(howToId);
        if (inFlight) return inFlight;

        const request = this.readHowTo(firestore, howToId).finally(() => {
            this.reading.delete(howToId);
        });
        this.reading.set(howToId, request);
        return request;
    }

    private async readHowTo(
        firestore: Firestore,
        howToId: string,
    ): Promise<HowTo | undefined | false> {
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
                // Nothing subscribes to this document, so exempt it from the
                // cache GC until some listener does.
                this.directReadIDs.add(howToId);

                return newHowTo;
            } else return undefined;
        } catch (error) {
            console.error(`Couldn't get how-to with ID ${howToId}:`, error);
            return this.db.isConnectivityError(error) ? false : undefined;
        }
    }

    /** Every how-to the viewer can see, and whether any lookup went unanswered.
     *  Filtering both failures away made a timed-out read indistinguishable
     *  from an empty space, and nothing re-runs a signed-out visitor's
     *  lookups. */
    async getHowTos(
        howToIds: string[],
    ): Promise<{ howTos: HowTo[]; unreachable: boolean }> {
        const results = await Promise.all(
            howToIds.map((id) => this.getHowTo(id)),
        );
        return {
            howTos: results.filter((ht): ht is HowTo => ht instanceof HowTo),
            unreachable: results.includes(false),
        };
    }

    /**
     * Stop the three uid-scoped listeners, leaving any public gallery watch
     * running.
     *
     * The split matters because one caller is the how-to *notifications*
     * setting: turning the bell off must not also stop a member reading a public
     * space. A member in that state gains a public watch instead, which is what
     * the re-evaluation at the end is for. See {@link stop} to end everything.
     */
    ignore() {
        if (this.listenDefer) {
            this.listenDefer();
            this.listenDefer = undefined;
        }
        this.unsubscribes.forEach((u) => u());
        this.unsubscribes = [];
        for (const key of Array.from(this.expectedListenerKeys))
            if (!key.startsWith(PublicListenerPrefix)) {
                this.expectedListenerKeys.delete(key);
                this.listenerDocIds.delete(key);
            }
        this.watchedGalleryKey = undefined;
        this.userListenersRunning = false;
        this.reevaluateWatches();
    }

    /** Stop everything, public watches included. For unmounting the app, as
     *  opposed to signing out or silencing notifications. */
    stop() {
        // Watches first: `ignore` re-decides them, and re-deciding one only to
        // tear it down a line later would subscribe and unsubscribe on the way
        // out of the page.
        this.galleryWatchers.stopAll();
        this.watchModes.clear();
        this.publicWatchState.clear();
        this.ignore();
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
        this.watchedGalleryKey = this.galleryKey();

        // Notifications only fire for how-tos published after this point in time.

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
                (snapshot) => this.handleSnapshot('own', snapshot),
                (error) => this.logFirebaseError(error),
            ),
        );

        // Listener 2: published how-tos in any of the user's editor/curator galleries.
        // Chunked because the read rule get()s each matched how-to's gallery and the
        // rules document-access budget denies a whole query needing too many distinct
        // get()s — see GALLERY_CHUNK_SIZE.
        // The `published == true` filter is required: the security rules only grant
        // gallery curators/collaborators read access to *published* how-tos (see the
        // read rule in firestore.rules). Other creators' unpublished drafts in these
        // galleries are not readable, and because Firestore rejects an entire query if
        // any matched doc is denied, omitting this filter triggers permission-denied.
        // The user's own drafts in these galleries are still covered by Listener 1.
        const editorGalleryIds = Array.from(
            this.db.Galleries.accessibleGalleries.keys(),
        );
        const editorChunks = chunkGalleries(editorGalleryIds);
        for (const [index, chunk] of editorChunks.entries()) {
            const key = `gallery:${index}`;
            const galleryQuery = query(
                collection(firestore, HowTosCollection),
                where('galleryId', 'in', chunk),
                where('published', '==', true),
            );
            this.unsubscribes.push(
                onSnapshot(
                    galleryQuery,
                    (snapshot) => this.handleSnapshot(key, snapshot),
                    (error) => this.logFirebaseError(error),
                ),
            );
        }

        // Listener 3: published how-tos visible via expanded scope — the galleries
        // a curator has opened to members of their other galleries. Selected by
        // gallery, exactly like Listener 2, because expanded access is a grant on
        // the gallery: it used to select on a `viewersFlat` field of the how-to
        // that nothing ever wrote, so it matched nothing and the whole feature was
        // dead (#907).
        //
        // `scopeOverwrite == false` is load-bearing for the same reason
        // `published == true` is above — the rule's viewer branch requires it, and
        // Firestore rejects the entire query if any matched doc would be denied.
        const scopeChunks = chunkGalleries(
            Array.from(this.db.Galleries.expandedScopeGalleries.keys()),
        );
        for (const [index, chunk] of scopeChunks.entries()) {
            const key = `scope:${index}`;
            const scopeQuery = query(
                collection(firestore, HowTosCollection),
                and(
                    where('galleryId', 'in', chunk),
                    where('published', '==', true),
                    where('scopeOverwrite', '==', false),
                ),
            );
            this.unsubscribes.push(
                onSnapshot(
                    scopeQuery,
                    (snapshot) => this.handleSnapshot(key, snapshot),
                    (error) => this.logFirebaseError(error),
                ),
            );
        }

        this.userListenersRunning = true;
        this.expectedListenerKeys.add('own');
        for (const [index] of editorChunks.entries())
            this.expectedListenerKeys.add(`gallery:${index}`);
        for (const [index] of scopeChunks.entries())
            this.expectedListenerKeys.add(`scope:${index}`);

        // These listeners are what makes a gallery "covered", and `listen` defers
        // this whole method to idle — so without re-deciding here, a gallery the
        // uid listeners now cover would keep the public query it started while
        // they were down, and pay for the same documents twice.
        this.reevaluateWatches();
    }

    /**
     * Re-subscribe when the set of galleries the user can reach changes, since
     * both chunked listeners' filters are built from it. A no-op when the set is
     * the same, so a gallery edit — a rename, a project added — churns nothing.
     *
     * This is not only for mid-session changes. `expandedScopeGalleries` is
     * filled by one of three gallery listeners, and `domainSettled` resolves on
     * the first of them to report, so on a cold load the set can still be empty
     * when the how-tos first subscribe. A warm load fills it from IndexedDB
     * first, which is why that gap shows up for a new account and not on a
     * machine that has run the app before.
     */
    /**
     * Watch one gallery's how-tos for whoever is looking at it, signed in or not.
     *
     * Acquired through `GalleryDatabase.watchPublic`, which is what a surface
     * calls; this is the how-to half. What it actually does depends on how this
     * viewer can reach these how-tos at all — see {@link GalleryWatchMode}.
     */
    watchGallery(galleryID: string): () => void {
        return this.galleryWatchers.watch(galleryID, () =>
            this.startGalleryWatch(galleryID),
        );
    }

    /**
     * How this viewer should reach this gallery's how-tos.
     *
     * The order matters. `expandedScopeGalleries` is checked *after* the public
     * branch because Listener 3 carries `scopeOverwrite == false`: on a gallery
     * that is also public it silently omits a how-to whose creator opted out of
     * expanded scope, which the rule's public branch would have admitted. Asking
     * "covered?" first would drop that how-to with no error anywhere.
     */
    private galleryWatchMode(galleryID: string): GalleryWatchMode {
        const galleries = this.db.Galleries;
        if (
            this.userListenersRunning &&
            galleries.accessibleGalleries.has(galleryID)
        )
            return 'covered';
        if (galleries.isKnownPublic(galleryID)) return 'public';
        if (
            this.userListenersRunning &&
            galleries.expandedScopeGalleries.has(galleryID)
        )
            return 'covered';
        return 'readthrough';
    }

    private startGalleryWatch(galleryID: string): () => void {
        const mode = this.galleryWatchMode(galleryID);
        this.watchModes.set(galleryID, mode);
        const forgetMode = () => this.watchModes.delete(galleryID);

        if (mode === 'covered') return forgetMode;
        if (mode === 'readthrough') {
            const stopAsking = this.keepAsking(true, () =>
                this.readGalleryHowTos(galleryID),
            );
            return () => {
                stopAsking();
                forgetMode();
            };
        }

        if (firestore === undefined) return forgetMode;

        // `published == true` is required, not an optimization: the rules put
        // every non-owner branch under it, and Firestore refuses a whole query
        // if any document it matched would be denied.
        //
        // `isPublic` must NOT be a filter. A how-to in a public gallery is
        // readable through the rule's `isGalleryPublic` branch whatever its own
        // flag says, and most are `isPublic: false` — filtering on it would
        // match nothing. `scopeOverwrite` must not be one either; that belongs
        // to the expanded-access branch, not this one.
        //
        // One gallery means the rule does one `get()`, so the chunking that
        // Listeners 2 and 3 need (GALLERY_CHUNK_SIZE) has nothing to do here.
        const key = `${PublicListenerPrefix}${galleryID}`;
        const publicQuery = query(
            collection(firestore, HowTosCollection),
            where('galleryId', '==', galleryID),
            where('published', '==', true),
        );

        this.expectedListenerKeys.add(key);
        this.publicWatchState.set(galleryID, 'watching');

        // A listen stream can wedge after the transport is interrupted and then
        // simply never deliver — no error, no failed request, nothing to catch.
        // #1380 found that on WebKit; cutting the connection reproduces it in
        // Chromium. So the subscription is not by itself a way back, and this
        // keeps asking by document until the first snapshot lands.
        //
        // It is free whenever the watch is working: `getHowTo` answers from the
        // cache, so a tick that fires after a snapshot costs no reads. The first
        // delay is long enough that a healthy cold connection has almost always
        // delivered before it, which is what keeps the watch's one query the
        // whole cost in the ordinary case.
        let delivered = false;
        const stopAsking = this.keepAsking(false, async () => {
            if (delivered) return true;
            await this.readGalleryHowTos(galleryID);
            // Done only when the stream itself has spoken: the documents may be
            // on the page by now, but a space that is still not listening would
            // miss everything published from here on.
            return delivered;
        });

        // Not deferred to idle, unlike the background listeners on login: this
        // one is the page's content, and waiting on an idle callback would hold
        // the canvas empty for up to two seconds.
        const unsubscribe = onSnapshot(
            publicQuery,
            (snapshot) => {
                this.handleSnapshot(key, snapshot);
                if (!delivered && !snapshot.metadata.fromCache) {
                    delivered = true;
                    stopAsking();
                    // A member of the gallery can also read drafts, which a
                    // `published` query cannot return. Ask for whatever the
                    // snapshot did not bring — and only then, or the two would
                    // race and buy the same documents twice.
                    if (this.canSeeGalleryDrafts(galleryID))
                        void this.readGalleryHowTos(galleryID);
                }
            },
            (error) => {
                // Not `logFirebaseError`: a visitor refused someone else's
                // gallery is not this creator's how-tos failing to sync.
                console.error(
                    `Couldn't watch how-tos in gallery ${galleryID}:`,
                    error,
                );
                const connectivity = this.db.isConnectivityError(error);
                this.publicWatchState.set(
                    galleryID,
                    connectivity ? 'unreachable' : 'denied',
                );
                if (connectivity) this.db.markFirebaseFailed();
            },
        );

        return () => {
            unsubscribe();
            stopAsking();
            // Drop the key from both, so the GC stops waiting on a listener that
            // is gone and may collect what only it held.
            this.expectedListenerKeys.delete(key);
            this.listenerDocIds.delete(key);
            this.publicWatchState.delete(galleryID);
            forgetMode();
        };
    }

    /** Whether this viewer may read drafts here — the one thing a public query
     *  cannot deliver. Membership of the gallery, which is what the rules ask. */
    private canSeeGalleryDrafts(galleryID: string): boolean {
        return canCreateHowTo(
            this.db.Galleries.getKnown(galleryID),
            this.db.getUser()?.uid,
        );
    }

    /** Read the gallery's own list of how-tos, one document at a time. Cache
     *  first, so ids a listener already delivered cost nothing. Answers whether
     *  every lookup was answered, since a read that went unanswered is the one
     *  worth making again. */
    private async readGalleryHowTos(galleryID: string): Promise<boolean> {
        const gallery = this.db.Galleries.getKnown(galleryID);
        // Not knowing the gallery is not a failed read: there is no list of
        // how-tos to ask for, so asking again would never find one. Whatever
        // makes it known re-decides this watch.
        if (gallery === undefined) return true;
        const { unreachable } = await this.getHowTos(gallery.getHowTos());
        return !unreachable;
    }

    /**
     * Ask again, waiting longer each time, until `attempt` reports it is done.
     *
     * Both ways of reaching a gallery's how-tos can fail in a way that nothing
     * else would notice. A one-shot read can go unanswered; and a listen stream
     * can wedge after the transport is interrupted and then never deliver at
     * all — no error, no failed request, nothing to catch (#1380 found that on
     * WebKit, and cutting the connection reproduces it in Chromium). A visitor
     * has no other listener whose snapshot might correct either, so without this
     * one bad moment leaves a public space blank for the life of the page.
     *
     * Mirrors the shape of `retryDelay.ts`, which covers the lookups the page
     * still makes for itself; the delays here are longer because this one is a
     * safety net under a subscription rather than the primary path.
     */
    private keepAsking(
        immediately: boolean,
        attempt: () => Promise<boolean>,
    ): () => void {
        let tries = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let cancelled = false;

        const ask = async () => {
            if (cancelled) return;
            if (await attempt()) return;
            if (cancelled) return;
            timer = setTimeout(
                ask,
                Math.min(FirstFallbackDelay * 2 ** tries++, MaxFallbackDelay),
            );
        };

        if (immediately) void ask();
        else timer = setTimeout(ask, FirstFallbackDelay);

        return () => {
            cancelled = true;
            if (timer !== undefined) clearTimeout(timer);
        };
    }

    /** The gallery document changed, so what its how-tos need may have too — it
     *  may have become public, or gained a how-to. */
    publicGalleryChanged(galleryID: string) {
        this.reevaluateWatch(galleryID);
    }

    /** Re-decide every live gallery watch after a change in who is signed in or
     *  what they can reach. */
    reevaluateWatches() {
        for (const galleryID of this.galleryWatchers.keys())
            this.reevaluateWatch(galleryID);
    }

    /** Restart one watch if and only if its answer moved — a restart re-reads,
     *  so doing it unconditionally would charge for every gallery change. */
    private reevaluateWatch(galleryID: string) {
        if (!this.galleryWatchers.has(galleryID)) return;
        if (this.watchModes.get(galleryID) !== this.galleryWatchMode(galleryID))
            this.galleryWatchers.restart(galleryID);
    }

    /** The how-tos cached for one gallery. What the four surfaces render, rather
     *  than each fetching the gallery's list for itself. */
    howTosInGallery(galleryID: string): HowTo[] {
        return Array.from(this.howtos.values()).filter(
            (howTo) => howTo.getHowToGalleryId() === galleryID,
        );
    }

    galleriesChanged() {
        if (firestore === undefined) return;
        const user = this.db.getUser();
        if (!user) return;
        if (this.galleryKey() === this.watchedGalleryKey) return;
        this.listen(firestore, user.uid);
    }

    /** Every gallery whose how-tos this user may see, as a stable string. */
    private galleryKey() {
        return [
            ...this.db.Galleries.accessibleGalleries.keys(),
            ...this.db.Galleries.expandedScopeGalleries.keys(),
        ]
            .sort()
            .join(',');
    }

    private handleSnapshot(key: string, snapshot: QuerySnapshot<DocumentData>) {
        // (a) Parse, upgrade, and cache every doc this listener saw.
        //     Track the IDs so we can garbage-collect later.
        const seen = new Set<string>();
        const synced: HowTo[] = [];
        snapshot.forEach((doc) => {
            const howto = doc.data();
            seen.add(doc.id);
            // A listener owns it now, so it no longer needs the one-shot read's
            // exemption from collection.
            this.directReadIDs.delete(doc.id);
            // Keep it in `seen` (so GC doesn't prune our own how-to), but skip
            // applying/caching it while it has unsaved local edits not yet
            // pushed — our local copy is authoritative until flushUnsaved
            // replays it. Not once the write has been refused permanently,
            // though — there is then nothing to replay, and holding authority
            // would blind the how-to to every later snapshot.
            if (this.isLocallyAuthoritative(doc.id)) return;
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
        snapshot.docChanges().forEach((change) => {});

        // (c) Cache GC: a doc should remain cached iff at least one listener still sees it.
        //     Only once every listener has reported, and only against server-fresh
        //     data. The old "listeners that haven't fired have no entry" reasoning
        //     held only on a cold start, when the cache is empty too; on a
        //     re-subscribe — which `galleriesChanged` now makes routine — the cache
        //     is full while `listenerDocIds` is empty, so whichever listener answers
        //     first would evict everything the others hold and the canvas would
        //     blank and refill on every membership change.
        if (
            !snapshot.metadata.fromCache &&
            Array.from(this.expectedListenerKeys).every((expected) =>
                this.listenerDocIds.has(expected),
            )
        ) {
            const union = new Set<string>();
            for (const ids of this.listenerDocIds.values())
                for (const id of ids) union.add(id);

            for (const cachedId of this.howtos.keys()) {
                // Keep how-tos with unsaved local edits even if no listener sees
                // them (they aren't on the server yet) — pruning them would drop the
                // only copy and leave nothing for flushUnsaved to replay. Keep
                // one-shot reads too: no listener ever claims them, so collecting
                // them would empty a deep link the moment any listener reported.
                if (
                    !union.has(cachedId) &&
                    !this.unsavedIDs.has(cachedId) &&
                    !this.directReadIDs.has(cachedId)
                )
                    this.howtos.delete(cachedId);
            }
        }

        // A public gallery watch is someone else's content being read, not this
        // creator's data syncing. Reporting it would spin the save-status footer
        // for a signed-in visitor until it landed, and settle `domainSettled`
        // mid-`startSync` for everyone else.
        if (!key.startsWith(PublicListenerPrefix))
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
