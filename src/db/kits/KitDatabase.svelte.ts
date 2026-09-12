import { type Database, type SaveCounts, type SaveError } from '@db/Database';
import { Domain } from '@db/Domains';
import { firestore } from '@db/firebase';
import SaveTracker, { type RePush } from '@db/SaveTracker.svelte';
import supportsIndexedDB from '@db/supportsIndexedDB';
import { getBuiltinKits } from './builtins';
import type Locales from '@locale/Locales';
import {
    and,
    doc,
    documentId,
    getDoc,
    getDocs,
    limit,
    or,
    orderBy,
    query,
    setDoc,
    startAfter,
    where,
    writeBatch,
    type Firestore,
    type Unsubscribe,
} from 'firebase/firestore';
import { collection, onSnapshot } from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import type { SerializedPreviewContent } from '@db/projects/ProjectSchemas';
import {
    KITS_PAGE,
    nextCursor,
    type KitCursor,
    type KitPage,
} from '@db/kits/kitPaging';
import {
    findPublishTarget,
    isWithdrawable,
    nextVersion,
    kitVersionID,
    KitSchema,
    KitVersionSchema,
    KitVersionSchemaLatestVersion,
    makeKit,
    MAX_KIT_VERSIONS,
    upgradeKit,
    type SerializedKit,
    type SerializedKitVersion,
} from './Kit';

export const KitsCollection = Domain.Kits;
/** Not a sync domain: a version is immutable, so it is never dirty and never listened to. */
export const KitVersionsCollection = 'kitversions';

/**
 * A creator's kits, and the published versions any project may read (#8).
 *
 * Far smaller than {@link CharactersDatabase}, and the reason is worth stating: a published
 * kit version never changes. There is nothing to listen for, nothing to invalidate, and no
 * cross-listener deletion sweep — a version is fetched once per device and cached forever.
 * The only realtime listener here is over the *user's own* kits, so their registry page and
 * publish dialog stay live.
 */
export default class KitDatabase {
    private readonly db: Database;

    /** The user's own kits, plus any fetched by id. `null` means "known absent". */
    readonly byID = $state<SvelteMap<string, SerializedKit | null>>(
        new SvelteMap(),
    );

    /** Kits by full `username/name`, mirroring {@link byID}; `null` is a cached miss. */
    readonly byName = $state<SvelteMap<string, SerializedKit | null>>(
        new SvelteMap(),
    );

    /**
     * Published versions, keyed by `${kit}_${version}`.
     *
     * Never evicted. A version is immutable by construction, so a stale entry is not
     * possible — which is the whole reason this feature costs so little to read.
     */
    private readonly versions = new Map<string, SerializedKitVersion | null>();

    /** In-flight version reads, so N borrows of one kit make one request. */
    private readonly versionRequests = new Map<
        string,
        Promise<SerializedKitVersion | null | undefined>
    >();

    /** In-flight name lookups, for the same reason: `withKits` runs per project, so N
     *  projects borrowing one kit would otherwise fire N queries before the first cached. */
    private readonly nameRequests = new Map<
        string,
        Promise<SerializedKit | null | undefined>
    >();

    private unsubscribe: Unsubscribe | undefined = undefined;

    readonly IndexedDBSupported = supportsIndexedDB();

    hydrated: boolean = $state(false);

    private readonly saves = new SaveTracker({
        domain: Domain.Kits,
        rePush: (id) => this.rePush(id),
        localDB: () => this.db.localDB,
        track: (write) => this.db.track(write),
        deviceCount: () => this.getOwnedKits().length,
        supported: () => this.IndexedDBSupported,
        isHydrated: () => this.hydrated,
        onStorageFull: () =>
            this.db.reportBanner((l) => l.ui.banner.storageFull),
    });

    get unsavedIDs() {
        return this.saves.unsavedIDs;
    }

    get saveErrors(): SaveError[] {
        return this.saves.saveErrors;
    }

    get saveCounts(): SaveCounts {
        return this.saves.saveCounts;
    }

    /**
     * The kits Wordplay ships with, newest version first per kit, for the guide's
     * built-in group — the shape `GalleryDatabase.getExampleGalleries` has for its own.
     */
    private builtins = $state<SerializedKit[]>([]);

    constructor(db: Database) {
        this.db = db;
        // Seeded before anything can ask, and re-derived when the chosen locales change,
        // because a built-in kit's description is the first sentence of its source's doc
        // in the reader's language. The store emits immediately, so this also does the
        // initial seed.
        // Held for this database's lifetime, which is the app's: it is constructed once,
        // by `loadKitsOnce`, and the built-ins must keep being re-derived after sign-out
        // too, so there is no moment at which releasing this would be right.
        db.Locales.locales.subscribe((locales) => this.seedBuiltins(locales));
        this.hydrate();
    }

    /**
     * Put the built-in kits where `getByName` and `getVersion` already look. Both
     * early-return from these caches, so seeding them *is* the resolution mechanism, and
     * seeding before any query means a cloud kit can never shadow a built-in by name.
     *
     * Deliberately not persisted: a built-in cached in IndexedDB would outlive the
     * release that shipped it, which is the one way one could ever go stale.
     */
    private seedBuiltins(locales: Locales) {
        const built = getBuiltinKits(locales);
        for (const { kit, version } of built) {
            this.byID.set(kit.id, kit);
            this.byName.set(kit.name, kit);
            this.versions.set(version.id, version);
        }
        this.builtins = [
            ...new Map(built.map(({ kit }) => [kit.id, kit])).values(),
        ];
    }

    /** The kits Wordplay ships with, for the guide to list above the registry. */
    getBuiltinKits(): SerializedKit[] {
        return this.builtins;
    }

    /** Every kit the current user owns. */
    getOwnedKits(): SerializedKit[] {
        const uid = this.db.getUserID();
        return uid === null
            ? []
            : [...this.byID.values()].filter(
                  (kit): kit is SerializedKit =>
                      kit !== null && kit.owner === uid,
              );
    }

    private rePush(id: string): RePush {
        if (firestore === undefined) return undefined;
        const kit = this.byID.get(id);
        if (kit === undefined || kit === null) return undefined;
        return {
            name: kit.name,
            write: setDoc(doc(firestore, KitsCollection, id), kit),
        };
    }

    async flushUnsaved() {
        await this.saves.flushUnsaved();
    }

    /** Warm the in-memory indexes from the local cache. */
    async hydrate() {
        if (!this.IndexedDBSupported) {
            this.hydrated = true;
            return;
        }
        await this.saves.seedDirty();
        try {
            for (const kit of await this.db.localDB.getAllKits())
                this.remember(kit);
            for (const version of await this.db.localDB.getAllKitVersions())
                this.versions.set(version.id, version);
        } catch {
            // A cache that won't open is not a reason to be unusable; the cloud
            // still answers, it just costs a read.
        }
        this.hydrated = true;
    }

    /** Keep {@link byID} and {@link byName} in lockstep, plus the local mirror. */
    private remember(kit: SerializedKit, persist = false) {
        this.byID.set(kit.id, kit);
        this.byName.set(kit.name, kit);
        for (const alias of kit.aliases) this.byName.set(alias, kit);
        if (persist && this.IndexedDBSupported)
            void this.db.localDB.saveKit(kit).catch(() => undefined);
    }

    /** Listen to the user's own kits, so their registry page and publish dialog stay live. */
    startSync(uid: string) {
        this.stopSync();
        // Who you are decides what you can see, so a miss cached while signed out is not
        // a miss any more. Auth hydrates *after* the first render, so a page that asks
        // for the creator's own unlisted kit — their kit's page, or a project borrowing
        // it — asks before anyone is signed in, gets the public-only answer, and caches
        // "there is no such kit" permanently. Dropping the misses here is what lets the
        // next ask succeed; a hit is still a hit, so nothing already found is re-fetched.
        this.forgetMisses();
        if (firestore === undefined) return;
        this.unsubscribe = onSnapshot(
            query(
                collection(firestore, KitsCollection),
                where('owner', '==', uid),
            ),
            (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    const parsed = KitSchema.safeParse(change.doc.data());
                    if (!parsed.success) {
                        // Never silent, for `getByName`'s reason: a kit that is there and
                        // won't parse is not the same as no kit, and dropping it quietly
                        // makes a creator's own kit vanish from every surface at once with
                        // nothing anywhere saying why. A missing schema default did
                        // exactly that.
                        this.db.reportListenerError(Domain.Kits, parsed.error);
                        continue;
                    }
                    if (change.type === 'removed')
                        this.forget(parsed.data.id, parsed.data.name);
                    // A kit with an unsaved local edit keeps its local copy; the
                    // cloud's is older by definition.
                    else if (!this.saves.isLocallyAuthoritative(parsed.data.id))
                        this.remember(upgradeKit(parsed.data), true);
                }
                // The count `Database.syncKits` reported was whatever was cached before
                // the listener existed; this is the real one.
                this.db.markSynced(Domain.Kits, this.getOwnedKits().length);
            },
            (error) => this.db.reportListenerError(Domain.Kits, error),
        );
    }

    /** Drop cached "there is no such kit" answers, which sign-in can turn into hits. */
    private forgetMisses() {
        for (const [id, kit] of [...this.byID])
            if (kit === null) this.byID.delete(id);
        for (const [name, kit] of [...this.byName])
            if (kit === null) this.byName.delete(name);
    }

    private forget(id: string, name: string) {
        this.byID.delete(id);
        this.byName.delete(name);
        if (this.IndexedDBSupported)
            void this.db.localDB.deleteKit(id).catch(() => undefined);
    }

    stopSync() {
        this.unsubscribe?.();
        this.unsubscribe = undefined;
    }

    /** Drop everything local, for sign-out. */
    async clear() {
        this.byID.clear();
        this.byName.clear();
        this.versions.clear();
        this.versionRequests.clear();
        if (this.IndexedDBSupported) await this.db.localDB.deleteAllKits();
        // Signing out drops what the cloud gave us, not what shipped with the app: a
        // project borrowing a built-in must keep resolving.
        this.seedBuiltins(this.db.Locales.getLocaleSet());
    }

    /**
     * The kit a borrow's `@username/name` refers to.
     *
     * `undefined` means we couldn't check; `null` means there is no such kit. Misses are
     * cached, so a typo doesn't re-query on every keystroke.
     */
    async getByName(name: string): Promise<SerializedKit | null | undefined> {
        const known = this.byName.get(name);
        if (known !== undefined) return known;
        if (firestore === undefined) return undefined;
        const pending = this.nameRequests.get(name);
        if (pending !== undefined) return pending;
        const request = this.fetchByName(name, firestore);
        this.nameRequests.set(name, request);
        try {
            return await request;
        } finally {
            this.nameRequests.delete(name);
        }
    }

    private async fetchByName(
        name: string,
        firestore: Firestore,
    ): Promise<SerializedKit | null | undefined> {
        const uid = this.db.getUserID();
        // A kit is readable when it is public, or when it is yours. Exactly the rule
        // `firestore.rules` states, so a query can never match a document the rules would
        // refuse — which would deny the whole query rather than omit the row.
        const visible =
            uid === null
                ? where('public', '==', true)
                : or(where('public', '==', true), where('owner', '==', uid));
        try {
            const found = await this.db.read(
                getDocs(
                    query(
                        collection(firestore, KitsCollection),
                        and(where('name', '==', name), visible),
                        limit(1),
                    ),
                ),
            );
            const first = found.docs[0];
            if (first !== undefined) {
                const parsed = KitSchema.safeParse(first.data());
                if (parsed.success) {
                    this.remember(upgradeKit(parsed.data), true);
                    return parsed.data;
                }
                // A kit that is there but doesn't parse is not the same thing as no kit,
                // and reporting it as absent tells a creator their kit is unknown when
                // the truth is that we found it and couldn't read it. Silent here cost an
                // afternoon once.
                this.db.reportListenerError(Domain.Kits, parsed.error);
                return undefined;
            }
            // A renamed kit keeps answering to its old name, because `↓ @amy/colors` sits
            // in other people's source and rewriting it is not ours to do. Separate query:
            // Firestore allows one `array-contains` per query, so it cannot join the
            // disjunction above — the lesson character lookup learned the hard way.
            const aliased = await this.db.read(
                getDocs(
                    query(
                        collection(firestore, KitsCollection),
                        and(
                            where('aliases', 'array-contains', name),
                            where('public', '==', true),
                        ),
                        limit(1),
                    ),
                ),
            );
            const alias = aliased.docs[0];
            if (alias !== undefined) {
                const parsed = KitSchema.safeParse(alias.data());
                if (parsed.success) {
                    this.remember(upgradeKit(parsed.data), true);
                    return parsed.data;
                }
            }
            this.byName.set(name, null);
            return null;
        } catch (error) {
            // Never silent: a refused or unindexed query is indistinguishable from "no
            // such kit" to everything downstream, and the creator is told their kit is
            // unknown when the truth is that we could not look.
            this.db.reportListenerError(Domain.Kits, error);
            return undefined;
        }
    }

    /**
     * One kit by id.
     *
     * `undefined` means we couldn't check; `null` means there is no such kit. Used by the
     * moderation queue, which knows a report's subject id and nothing else.
     */
    async getByID(id: string): Promise<SerializedKit | null | undefined> {
        const known = this.byID.get(id);
        if (known !== undefined) return known;
        if (firestore === undefined) return undefined;
        try {
            const snapshot = await this.db.read(
                getDoc(doc(firestore, KitsCollection, id)),
            );
            if (!snapshot.exists()) {
                this.byID.set(id, null);
                return null;
            }
            const parsed = KitSchema.safeParse(snapshot.data());
            if (!parsed.success) return undefined;
            this.remember(upgradeKit(parsed.data), true);
            return parsed.data;
        } catch {
            return undefined;
        }
    }

    /**
     * One published version, cached permanently.
     *
     * The cache is never invalidated because a version cannot change. That is what makes
     * a class of thirty students borrowing one kit cost thirty reads ever.
     */
    async getVersion(
        kit: string,
        version: number,
    ): Promise<SerializedKitVersion | null | undefined> {
        const id = kitVersionID(kit, version);
        const known = this.versions.get(id);
        if (known !== undefined) return known;
        const inFlight = this.versionRequests.get(id);
        if (inFlight !== undefined) return inFlight;
        if (firestore === undefined) return undefined;

        const request = (async () => {
            try {
                const snapshot = await this.db.read(
                    getDoc(doc(firestore, KitVersionsCollection, id)),
                );
                const parsed = snapshot.exists()
                    ? KitVersionSchema.safeParse(snapshot.data())
                    : undefined;
                const result =
                    parsed !== undefined && parsed.success ? parsed.data : null;
                this.versions.set(id, result);
                if (result !== null && this.IndexedDBSupported)
                    void this.db.localDB
                        .saveKitVersion(result)
                        .catch(() => undefined);
                return result;
            } catch (error) {
                this.db.reportListenerError(Domain.Kits, error);
                return undefined;
            } finally {
                this.versionRequests.delete(id);
            }
        })();
        this.versionRequests.set(id, request);
        return request;
    }

    /** Every version of a kit, newest first, for the version history. */
    async getVersions(kit: string): Promise<SerializedKitVersion[]> {
        const record = this.byID.get(kit);
        if (record === null || record === undefined) return [];
        // All at once rather than one round trip per version: they are independent reads,
        // and a kit may have up to `MAX_KIT_VERSIONS` of them.
        const found = await Promise.all(
            Array.from({ length: record.latest }, (_, index) =>
                this.getVersion(kit, record.latest - index),
            ),
        );
        return found.filter(
            (version): version is SerializedKitVersion =>
                version !== null && version !== undefined,
        );
    }

    /**
     * Publish a new version of a kit, creating the kit if this is its first. One batch, so
     * a version and the `latest` pointing at it can never disagree, and the existing kit is
     * found by **id** rather than by name — see {@link findPublishTarget}.
     */
    async publish(
        kitID: string | null,
        name: string,
        description: string,
        source: { sourceName: string; code: string; locales: string[] },
        exports: string[],
        /** What the kit shares, as concept ids — see `kitKinds`. Passed in rather than
         *  computed here: this module is dynamically imported precisely so the language
         *  runtime stays off the page graphs, and classifying types needs all of it. */
        kinds: string[],
        originProject: string | null,
        preview: SerializedPreviewContent | undefined,
    ): Promise<
        { kit: SerializedKit; version: SerializedKitVersion } | undefined
    > {
        const uid = this.db.getUserID();
        // Publishing requires an account: a kit is code other people run, so it has an
        // owner who can be asked about it and, if need be, moderated.
        if (firestore === undefined || uid === null) return undefined;

        const existing = findPublishTarget(this.byID, kitID, uid);
        if (existing && existing.versionCount >= MAX_KIT_VERSIONS)
            return undefined;

        const next = existing === undefined ? 1 : nextVersion(existing);
        const kit: SerializedKit = existing
            ? {
                  ...existing,
                  // A rename can have moved the kit's name out from under the project, so
                  // the name the creator sees in the dialog is the kit's, not the one
                  // typed the first time.
                  name: existing.name,
                  description,
                  exports,
                  kinds,
                  ...(preview !== undefined ? { preview } : {}),
                  latest: next,
                  versionCount: next,
                  updated: Date.now(),
                  originProject,
              }
            : {
                  ...makeKit(uuidv4(), uid, name, description, originProject),
                  exports,
                  kinds,
                  ...(preview !== undefined ? { preview } : {}),
                  latest: 1,
                  versionCount: 1,
              };

        const version: SerializedKitVersion = {
            v: KitVersionSchemaLatestVersion,
            id: kitVersionID(kit.id, kit.latest),
            kit: kit.id,
            version: kit.latest,
            owner: uid,
            name: kit.name,
            // Published means readable. Discovery is the kit's own `public`, which stays
            // the creator's decision; only moderation clears this one.
            public: true,
            sourceName: source.sourceName,
            code: source.code,
            locales: source.locales,
            exports,
            // Rendered once, here, so browsing the registry evaluates nothing — the same
            // bargain a how-to makes. Omitted rather than undefined: the field is exactly
            // optional and Firestore rejects an undefined value.
            ...(preview !== undefined ? { preview } : {}),
            created: Date.now(),
        };

        const batch = writeBatch(firestore);
        batch.set(doc(firestore, KitsCollection, kit.id), kit);
        batch.set(doc(firestore, KitVersionsCollection, version.id), version);

        // Remembered before the write, because `trackSave` retries a `permission-denied`
        // through `rePush`, which reads the kit back out of `byID` — a stale token is the
        // usual cause and that retry is what recovers it.
        this.remember(kit, true);
        this.versions.set(version.id, version);
        const saved = await this.saves.trackSave(
            kit.id,
            kit.name,
            batch.commit(),
        );
        // ...and put back what was there if it never landed. Left standing, the optimistic
        // copy claimed a version that existed on one device, and the moderation notice
        // read from it — so a creator was told their new version was waiting for a
        // moderator who was never going to see it, with no way to tell. The rollback runs
        // after `trackSave` has resolved, so the retry above has already had its chance.
        if (!saved) {
            this.versions.delete(version.id);
            if (existing === undefined) this.forget(kit.id, kit.name);
            else this.remember(existing, true);
            return undefined;
        }
        return { kit, version };
    }

    /**
     * The public registry: kits that are shared and have a version a moderator approved.
     *
     * Both clauses matter. `public` is the creator's request to be listed; `listed` is the
     * moderator's answer, and listing on `public` alone would put unreviewed code in front
     * of everyone — the shape galleries' listing already has.
     *
     * `terms` searches the server-maintained `words` index rather than the documents, so
     * finding a kit costs one query instead of reading every kit in existence.
     */
    async getListed(options?: {
        /** Words to search for. Mutually exclusive with `kind` — see below. */
        terms?: string[];
        /** A concept id to filter by, from `kitKinds`. */
        kind?: string;
        /** Where the previous page stopped. */
        after?: KitCursor;
        size?: number;
    }): Promise<KitPage<SerializedKit>> {
        if (firestore === undefined) return { kits: [], cursor: undefined };
        const { terms, kind, after } = options ?? {};
        const size = options?.size ?? KITS_PAGE;
        try {
            const found = await this.db.read(
                getDocs(
                    query(
                        collection(firestore, KitsCollection),
                        and(
                            where('public', '==', true),
                            // `listed`, not `moderation`: a kit whose newest version is
                            // awaiting review keeps the listing its approved version
                            // earned, and the moderator queue keeps filtering on
                            // `moderation` so the new version is still reviewed.
                            where('listed', '==', true),
                            // Firestore allows exactly one array operation per query, which
                            // is why searching and filtering by kind are never combined: the
                            // registry offers the kind filter only where there is no search
                            // box, so this is a choice rather than a compromise.
                            ...(terms && terms.length > 0
                                ? [
                                      where(
                                          'words',
                                          'array-contains-any',
                                          // Firestore caps a disjunction at 30 values, and a
                                          // search box is not where to spend that budget.
                                          terms.slice(0, 10),
                                      ),
                                  ]
                                : kind !== undefined
                                  ? [where('kinds', 'array-contains', kind)]
                                  : []),
                        ),
                        orderBy('updated', 'desc'),
                        // The tiebreak is not optional: `updated` is a millisecond, and
                        // `startAfter` on it alone positions past *every* kit sharing that
                        // millisecond. Same direction as `updated`, so it matches the
                        // `__name__` every composite index already ends with.
                        orderBy(documentId(), 'desc'),
                        ...(after ? [startAfter(after.updated, after.id)] : []),
                        limit(size),
                    ),
                ),
            );
            const kits: SerializedKit[] = [];
            for (const document of found.docs) {
                const parsed = KitSchema.safeParse(document.data());
                // Browsing is not owning: `remember(…, true)` would write every kit
                // anyone scrolls past into IndexedDB, and the registry is now unbounded.
                if (parsed.success) {
                    this.remember(upgradeKit(parsed.data));
                    kits.push(parsed.data);
                }
            }
            return {
                kits,
                cursor: nextCursor(
                    found.docs.map((document) => ({
                        updated: document.get('updated'),
                        id: document.id,
                    })),
                    size,
                ),
            };
        } catch (error) {
            // Reported rather than swallowed, for the reason `getByName` gives: a missing
            // composite index throws, and an empty registry is indistinguishable from one
            // nobody has published to. Silent here cost an afternoon once.
            this.db.reportListenerError(Domain.Kits, error);
            return { kits: [], cursor: undefined };
        }
    }

    /** Make a kit discoverable in the registry, or stop. */
    /**
     * Withdraw a kit's newest version.
     *
     * `versionCount` is deliberately left alone: it is the high-water mark the next
     * publish numbers from, so the withdrawn number is never reissued. See `Kit.ts`.
     */
    async withdraw(id: string): Promise<boolean> {
        if (firestore === undefined) return false;
        const kit = this.byID.get(id);
        if (!kit || !isWithdrawable(kit)) return false;

        const versionID = kitVersionID(kit.id, kit.latest);
        const updated: SerializedKit = {
            ...kit,
            latest: kit.latest - 1,
            updated: Date.now(),
        };

        const batch = writeBatch(firestore);
        batch.delete(doc(firestore, KitVersionsCollection, versionID));
        batch.set(doc(firestore, KitsCollection, kit.id), updated);

        this.remember(updated, true);
        this.versions.delete(versionID);
        const saved = await this.saves.trackSave(
            kit.id,
            kit.name,
            batch.commit(),
        );
        return saved !== undefined && saved !== false;
    }

    async setPublic(id: string, isPublic: boolean) {
        if (firestore === undefined) return;
        const kit = this.byID.get(id);
        if (!kit) return;
        // `moderation` is deliberately NOT written here. Asking to be listed is not being
        // listed — a moderator decides, and the registry query is
        // `public && moderation == 'approved'`. `kitServerFieldsUnchanged()` refuses any
        // write that carries it, and that refusal is silent: the save would simply never
        // land. The `kitEdited` trigger moves it to `pending` instead.
        const updated: SerializedKit = {
            ...kit,
            public: isPublic,
            updated: Date.now(),
        };
        this.remember(updated, true);
        await this.saves.trackSave(
            id,
            kit.name,
            setDoc(doc(firestore, KitsCollection, id), updated),
        );
    }
}
