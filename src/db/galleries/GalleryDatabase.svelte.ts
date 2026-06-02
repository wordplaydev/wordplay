import type { ProjectID } from '@db/projects/ProjectSchemas';
import { FirebaseError } from 'firebase/app';
import {
    and,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    or,
    query,
    setDoc,
    where,
    writeBatch,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { v4 as uuidv4 } from 'uuid';
import { getExampleGalleries } from '../../examples/examples';
import { localeToString } from '@locale/Locale';
import type Locales from '@locale/Locales';
import { type Database, type SaveCounts, type SaveError } from '@db/Database';
import { firestore } from '@db/firebase';
import { Domain } from '@db/Domains';
import SaveTracker from '@db/SaveTracker.svelte';
import supportsIndexedDB from '@db/supportsIndexedDB';
import type Project from '@db/projects/Project';
import { ProjectsCollection } from '@db/projects/ProjectsDatabase.svelte';
import {
    ClassesCollection,
    ClassSchema,
    getClass,
    setClass,
} from '@db/teachers/TeacherDatabase.svelte';
import Gallery, {
    deserializeGallery,
    GallerySchemaLatestVersion,
    type SerializedGallery,
} from '@db/galleries/Gallery';

/** The name of the galleries collection in Firebase */
export const GalleriesCollection = Domain.Galleries;

/** The in-memory representation of a Gallery, for type safe manipulation and analysis. */
export default class GalleryDatabase {
    /** The main database that manages this gallery database */
    readonly database: Database;

    /**
     * A reactive map of the galleries that have been loaded from the database because this creator is a creator or curator of the gallery.
     **/
    readonly accessibleGalleries: SvelteMap<string, Gallery> = new SvelteMap();

    /**
     * A reactive map of the galleries where the user has access to its how-tos via "expanded scope"
     * (i.e., they are a creator or curator of a gallery A, which gives them access to gallery B
     * iff the curator of gallery A is the curator of gallery B and set the visibility of how-tos
     * to "expanded" for gallery B.)
     */
    readonly expandedScopeGalleries: SvelteMap<string, Gallery> =
        new SvelteMap();

    /** A reactive loading status, for the UI. */
    private status = $state<'loading' | 'noaccess' | 'loggedout' | 'loaded'>(
        'loading',
    );

    /** Example hard coded galleries */
    private exampleGalleries: Gallery[] = $state([]);

    /** Public galleries that have been loaded individually, by gallery ID. */
    readonly publicGalleries: SvelteMap<string, Gallery> = new SvelteMap();

    /** Whether this is a browser with IndexedDB support. */
    readonly IndexedDBSupported = supportsIndexedDB();

    /** Flips true once the accessible/expanded-scope maps have been populated
     *  from the local cache (or immediately, when there's no IndexedDB). */
    hydrated: boolean = $state(false);

    /** The galleries last read from the local cache. Held separately from the
     *  role-split maps because the accessible/expanded-scope assignment depends
     *  on the current user, which may not be known yet when the cache first
     *  emits — `applySplit` re-derives the maps from this whenever either the
     *  cache or the user changes. */
    private cachedGalleries: Gallery[] = [];

    /** Per-item cloud-save tracking (unsaved set, errors, counts, durable dirty
     *  rows), shared with the other domain facades. See {@link SaveTracker}. */
    private readonly saves = new SaveTracker({
        domain: Domain.Galleries,
        localDB: () => this.database.localDB,
        track: (write) => this.database.track(write),
        deviceCount: () => this.accessibleGalleries.size,
        supported: () => this.IndexedDBSupported,
        isHydrated: () => this.hydrated,
    });

    /** IDs of the user's galleries whose latest edit hasn't been confirmed
     *  saved in the cloud (write pending or failed). */
    get unsavedIDs() {
        return this.saves.unsavedIDs;
    }

    /** Save failures for the save-status dialog. */
    get saveErrors(): SaveError[] {
        return this.saves.saveErrors;
    }

    /** How many of the user's galleries (those they curate or create) are saved
     *  on this device, in the cloud, and unsaved. */
    get saveCounts(): SaveCounts {
        return this.saves.saveCounts;
    }

    /** The unsubscribe function for the real time query for galleries this user has access to. */
    private galleriesQueryUnsubscribe: Unsubscribe | undefined;

    /** A sorted, comma-joined key of the accessible-gallery IDs the projects
     *  query was last subscribed for. We only re-subscribe the projects query
     *  when this set actually changes — re-subscribing on every galleries
     *  snapshot needlessly tore down and rebuilt all project listeners. */
    private watchedGalleryKey: string | undefined = undefined;

    /** A list of projects on which listeners for gallery updates to keep data in sync. */
    private listeners: Map<ProjectID, Set<(gallery: Gallery) => void>> =
        new Map();

    constructor(database: Database) {
        this.database = database;

        // Add the example galleries to the database.
        const examples = getExampleGalleries(database.Locales.getLocaleSet());
        for (const gallery of examples) {
            this.publicGalleries.set(gallery.getID(), gallery);
            this.exampleGalleries.push(gallery);
        }

        // When the list of locales change, recreate the galleries with the new locales.
        database.Locales.locales.subscribe((locales) => {
            // Update each gallery store with the new localized gallery.
            const localizedExamples = getExampleGalleries(locales);
            for (const gallery of localizedExamples) {
                this.publicGalleries.set(gallery.getID(), gallery);
            }
            // Update the list of example galleries.
            this.exampleGalleries = localizedExamples;
        });

        // Warm the accessible/expanded-scope maps from the local cache before
        // (and independently of) the cloud listener.
        this.hydrate();

        this.registerRealtimeUpdates();
    }

    getExampleGalleries() {
        return this.exampleGalleries;
    }

    /** Populate the role-split maps from the shared local cache, then keep them
     *  in sync with local writes (including cross-tab). The first emission flips
     *  `hydrated`. */
    async hydrate() {
        if (!this.IndexedDBSupported) {
            this.hydrated = true;
            return;
        }
        // Seed the in-memory unsaved set from the durable dirty table BEFORE the
        // cloud listener runs, so its skip-dirty guard preserves local edits
        // that haven't reached the cloud yet.
        await this.saves.seedDirty();
        let firstEmission = true;
        this.database.localDB.getAllGalleries().subscribe((galleries) => {
            // Defend against a malformed or unknown-version cached doc: drop it
            // rather than letting one bad gallery throw and abort hydration.
            this.cachedGalleries = galleries
                .map((g) => {
                    try {
                        return deserializeGallery(g);
                    } catch (error) {
                        console.error(error);
                        return undefined;
                    }
                })
                .filter((g): g is Gallery => g !== undefined);
            this.applySplit();
            if (firstEmission) {
                firstEmission = false;
                this.hydrated = true;
            }
        });
    }

    /** Re-derive the accessible/expanded-scope maps from the cached galleries
     *  using the current user. Additive and corrective (moves a gallery between
     *  maps if the user's role changed) but never blanket-clears, so it coexists
     *  with the cloud listener's incremental updates. No-op until the user is
     *  known. Never writes to the cache, so the hydrate subscription can't loop. */
    private applySplit() {
        const uid = this.database.getUser()?.uid;
        if (uid === undefined) return;
        for (const gallery of this.cachedGalleries) {
            const id = gallery.getID();
            if (
                gallery.getCreators().includes(uid) ||
                gallery.getCurators().includes(uid)
            ) {
                this.accessibleGalleries.set(id, gallery);
                this.expandedScopeGalleries.delete(id);
            } else {
                this.expandedScopeGalleries.set(id, gallery);
                this.accessibleGalleries.delete(id);
            }
        }
    }

    /** Mirror authoritative galleries into the local cache for cold-start
     *  hydration. Never called from the hydrate path, to avoid a write/emit
     *  loop. */
    private cacheGalleriesLocally(galleries: Gallery[]) {
        if (!this.IndexedDBSupported || galleries.length === 0) return;
        try {
            this.database.localDB.saveGalleries(
                galleries.map((g) => g.getData()),
            );
        } catch (error) {
            console.error(error);
        }
    }

    /** Clear the local gallery cache and the cloud-sourced maps. Used on
     *  account-switch and explicit sign-out, mirroring Projects' local wipe.
     *  Leaves example/public galleries (not user-scoped) untouched. */
    async clearLocal() {
        this.cachedGalleries = [];
        this.accessibleGalleries.clear();
        this.expandedScopeGalleries.clear();
        await this.saves.clearTracking();
        if (this.IndexedDBSupported)
            await this.database.localDB.deleteAllGalleries();
    }

    /** Find all galleries that this user has access to */
    registerRealtimeUpdates() {
        // No database access? Bail and mark an error.
        if (firestore === undefined) {
            this.status = 'noaccess';
            return;
        }

        // No user? Bail and mark an error.
        const user = this.database.getUser();
        if (user === null) {
            this.status = 'loggedout';
            return;
        }

        this.status = 'loading';
        this.database.markSyncing(Domain.Galleries);

        // The user is now known, so derive the maps from whatever the local
        // cache already holds — galleries appear immediately (and offline),
        // before the cloud snapshot arrives.
        this.applySplit();

        // Reset so the first snapshot for this (re)subscription always syncs the
        // projects query for the new user/access.
        this.watchedGalleryKey = undefined;

        this.galleriesQueryUnsubscribe = onSnapshot(
            // Listen for any changes to galleries for which this user is a curator or creator.
            // also listen to any changes to galleries where the user is a viewer of its how-tos
            query(
                collection(firestore, GalleriesCollection),
                or(
                    where('curators', 'array-contains', user.uid),
                    where('creators', 'array-contains', user.uid),
                    and(
                        where('howToExpandedVisibility', '==', true),
                        where('howToViewersFlat', 'array-contains', user.uid),
                    ),
                ),
            ),
            async (snapshot) => {
                // Go through all of the galleries and update them.
                const synced: Gallery[] = [];
                snapshot.forEach((galleryDoc) => {
                    // Wrap it in a gallery. Defend against a malformed or
                    // unknown-version doc: skip it rather than letting one bad
                    // gallery throw and abort the whole snapshot.
                    let gallery: Gallery;
                    try {
                        gallery = deserializeGallery(galleryDoc.data());
                    } catch (error) {
                        console.error(error);
                        return;
                    }

                    // Skip galleries with unsaved local edits not yet pushed:
                    // our local copy is authoritative until flushUnsaved replays
                    // it, so don't let an older cloud version overwrite it in
                    // memory or the cache.
                    if (this.unsavedIDs.has(gallery.getID())) return;

                    synced.push(gallery);

                    if (
                        gallery.getCreators().includes(user.uid) ||
                        gallery.getCurators().includes(user.uid)
                    ) {
                        // Get the store for the gallery, or make one if we don't have one yet, and update the map.
                        // Also check the public galleries, in case we loaded it there first, so we reuse the same store.
                        this.accessibleGalleries.set(gallery.getID(), gallery);

                        // Notify the project's database that gallery permissions changed, requring a reload of the any projects in the gallery to see new permissions.
                        this.database.Projects.refreshGallery(gallery);
                    } else {
                        // user is only a how-to viewer, which means they have expanded scope access only
                        this.expandedScopeGalleries.set(
                            gallery.getID(),
                            gallery,
                        );
                    }
                });

                // Mirror the cloud truth into the local cache for next cold start.
                this.cacheGalleriesLocally(synced);

                // Remove the galleries that were removed from this query.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    // gallery is either in accessibleGalleries or expandedScopeGalleries
                    if (change.type === 'removed') {
                        this.accessibleGalleries.delete(change.doc.id);
                        this.expandedScopeGalleries.delete(change.doc.id);
                        if (this.IndexedDBSupported)
                            void this.database.localDB.deleteGallery(
                                change.doc.id,
                            );
                    }
                });

                // Re-subscribe the projects query only when the SET of accessible
                // galleries changed — its `gallery in [...]` filter depends on
                // that set. Re-subscribing on every gallery content/metadata
                // change churned the whole projects query for nothing; project
                // updates *within* already-watched galleries keep streaming on
                // the live listeners regardless.
                const watchedKey = Array.from(this.accessibleGalleries.keys())
                    .sort()
                    .join(',');
                if (watchedKey !== this.watchedGalleryKey) {
                    this.watchedGalleryKey = watchedKey;
                    this.database.Projects.syncUser(false);
                }

                // Mark the database loaded.
                this.status = 'loaded';
                this.database.markSynced(
                    'galleries',
                    this.accessibleGalleries.size,
                );
            },
            (error) => {
                this.status = 'noaccess';
                // Always terminal so the save-status button stops its "loading"
                // spinner and the dialog shows "failed" — even for a permission
                // or index error. Only a connectivity error additionally flips
                // the offline/unreachable state.
                this.database.markSyncFailed(Domain.Galleries);
                if (this.database.isConnectivityError(error))
                    this.database.markFirebaseFailed();
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
            },
        );
    }

    getStatus() {
        return this.status;
    }

    /** Call the given function when the project with the given ID is involved in a gallery edit. */
    listen(projectID: string, listener: (gallery: Gallery) => void) {
        const current = this.listeners.get(projectID);
        if (current) current.add(listener);
        else this.listeners.set(projectID, new Set([listener]));
    }

    /** Stop calling the given function when the project with the given ID is involved in a gallery edit. */
    ignore(projectID: string, listener: (gallery: Gallery) => void) {
        const current = this.listeners.get(projectID);
        if (current) current.delete(listener);
    }

    /** Create a new gallery, with the given curators and creators, defaulting to the current user as curator and an empty list of creators.*/
    async create(
        locales: Locales,
        curators?: string[],
        creators?: string[],
        classid?: string,
    ): Promise<string | undefined> {
        const user = this.database.getUser();
        if (user === null) return undefined;

        if (firestore === undefined) return undefined;

        const id = uuidv4();
        const name: Record<string, string> = {};
        name[localeToString(locales.getLocales()[0])] =
            locales.getUnannotatedText((l) => l.ui.gallery.untitled);
        const description: Record<string, string> = {};
        description[localeToString(locales.getLocales()[0])] = '';

        const gallery: SerializedGallery = {
            v: GallerySchemaLatestVersion,
            id,
            path: null,
            name,
            description,
            words: [],
            projects: [],
            curators: curators ?? [user.uid],
            creators: creators ?? [],
            public: false,
            featured: false,
            howTos: [],
            howToExpandedVisibility: false,
            howToExpandedGalleries: [],
            howToViewers: {},
            howToViewersFlat: [],
            howToGuidingQuestions: locales.getUnannotatedTexts(
                (l) => l.ui.howto.configuration.guidingQuestions.default,
            ),
            howToReactions: locales.getTextStructure(
                (l) => l.ui.howto.configuration.reactions.default,
            ),
        };

        // Save the gallery online, and then locally. Return when it's created.
        await this.edit(new Gallery(gallery));

        // Update the class to reference the newly created gallery.
        if (classid) {
            const group = await getClass(classid);
            if (group) {
                await setClass({
                    ...group,
                    galleries: [...group.galleries, id],
                });
            } else console.error("Couldn't find class to update.");
        }

        return id;
    }

    /** Get a gallery with this ID */
    async get(id: string): Promise<Gallery | undefined> {
        // See if we have it cached.
        const cache = this.accessibleGalleries.get(id);
        if (cache) return cache;
        const expandedCache = this.expandedScopeGalleries.get(id);
        if (expandedCache) return expandedCache;

        // See if it's a public gallery.
        const publicGallery = this.publicGalleries.get(id);
        if (publicGallery) return publicGallery;

        // Didn't find it locally? See if we get read it from the database.
        if (firestore) {
            try {
                const galDoc = await this.database.read(
                    getDoc(doc(firestore, GalleriesCollection, id)),
                );
                if (galDoc.exists()) {
                    const gallery = deserializeGallery(galDoc.data());
                    this.publicGalleries.set(id, gallery);
                    return gallery;
                }
            } catch (err) {
                console.error(`Couldn't get gallery with ID ${id}:`, err);
                return undefined;
            }
        }

        // Didn't find it.
        return undefined;
    }

    /** Update the given gallery in the cloud. */
    /** Wrap a cloud write so the save-status dialog reflects it; see
     *  {@link SaveTracker.trackSave}. */
    private trackSave(
        id: string,
        name: string | undefined,
        write: Promise<unknown>,
    ): Promise<boolean> {
        return this.saves.trackSave(id, name, write);
    }

    /** Re-attempt the cloud write for every gallery still marked unsaved (e.g.
     *  edits made offline before a reload). Called once the user is known
     *  (startSync) and on reconnect. A no-op when nothing is unsaved. */
    async flushUnsaved() {
        if (firestore === undefined) return;
        const db = firestore;
        await this.saves.flushUnsaved((id) => {
            const gallery = this.accessibleGalleries.get(id);
            return gallery
                ? {
                      name: gallery.getName(
                          this.database.Locales.getLocaleSet(),
                      ),
                      write: setDoc(
                          doc(db, GalleriesCollection, id),
                          gallery.data,
                      ),
                  }
                : undefined;
        });
    }

    async edit(gallery: Gallery) {
        if (firestore === undefined) return undefined;

        // Write FIRST, then reflect it locally. We must not add the gallery to
        // `accessibleGalleries` before its doc exists server-side: that map
        // feeds the projects `where('gallery', 'in', ...)` query, whose security
        // rule does `get(/galleries/<id>)` — referencing a not-yet-written
        // gallery makes the rule error and fails the whole projects query.
        await this.trackSave(
            gallery.getID(),
            gallery.getName(this.database.Locales.getLocaleSet()),
            setDoc(
                doc(firestore, GalleriesCollection, gallery.getID()),
                gallery.data,
            ),
        );

        // Now add/update it in the accessible map (a user can only edit
        // galleries they curate/create, so it belongs there). We do this
        // explicitly rather than waiting for the realtime listener, because the
        // listener skips galleries with unsaved local edits — a brand-new
        // gallery would otherwise never appear (e.g. empty gallery chooser).
        this.accessibleGalleries.set(gallery.getID(), gallery);
        this.expandedScopeGalleries.delete(gallery.getID());

        // Mirror to the local cache so the gallery survives a reload even while
        // its dirty flag is pending: the realtime listener skips dirty galleries
        // (and so doesn't cache them), so without this a just-created gallery
        // could vanish on reload — not in the cache to hydrate, skipped by the
        // listener, and unrecoverable by flushUnsaved.
        this.cacheGalleriesLocally([gallery]);

        // Notify all project listeners about the gallery updated.
        for (const project of gallery.getProjects()) {
            const listeners = this.listeners.get(project);
            if (listeners) listeners.forEach((listener) => listener(gallery));
        }
    }

    async delete(gallery: Gallery) {
        if (firestore === undefined) return undefined;
        const user = this.database.getUser();
        if (user === null) return undefined;

        // Remove all projects from the gallery.
        for (const projectID of gallery.getProjects()) {
            const project = await this.database.Projects.get(projectID);
            if (project) await this.removeProjectFromGallery(project);
        }

        // Delete all how-tos in the gallery
        gallery.getHowTos().forEach(async (howToID) => {
            await this.database.HowTos.deleteHowTo(howToID, gallery);
        });

        // Remove the gallery from any classes it is in.
        const classes = await getDocs(
            query(
                collection(firestore, ClassesCollection),
                where('galleries', 'array-contains', gallery.getID()),
            ),
        );
        // Don't wait for each removal, just async request it.
        classes.forEach((doc) => {
            const group = ClassSchema.parse(doc.data());
            setClass({
                ...group,
                galleries: group.galleries.filter((g) => g !== gallery.getID()),
            });
        });

        // Delete the gallery document now that the projects are removed. forget
        // drops the unsaved/error state AND the durable dirty row, so a gallery
        // deleted while dirty can't re-seed unsavedIDs on reload.
        this.saves.forget(gallery.getID());
        await this.database.track(
            deleteDoc(doc(firestore, GalleriesCollection, gallery.getID())),
        );
    }

    // Add the given project to the given gallery ID, or remove it if the gallery ID is undefined.
    async addProject(project: Project, galleryID: string) {
        if (firestore === undefined || galleryID === undefined) return;

        // Find the gallery.
        const gallery = await this.get(galleryID);
        if (gallery === undefined) return;

        const projectID = project.getID();
        const oldGalleryID = project.getGallery();

        // Update the in-memory project to reflect the new gallery. Pass persist=false
        // so we can include the project doc write in our atomic batch below rather than
        // letting the project history's separate persist() race with it.
        const editResult = await this.database.Projects.edit(
            project.withGallery(galleryID),
            false,
            false,
            false,
            'immediate',
        );
        if (editResult !== undefined) return;

        // Get the just-edited project so we can serialize its latest form into the batch.
        const updated =
            this.database.Projects.getHistory(projectID)?.getCurrent();
        if (updated === undefined) return;

        // If a concurrent share/unshare ran between our history edit and now,
        // history.current will reflect that newer intent. Bail so the latest call
        // wins. This collapses the double-fire from the Options widget (its
        // onpointerdown + onchange both call this) and absorbs click-and-correct
        // sequences within a single event-loop turn.
        if (updated.getGallery() !== galleryID) return;

        // Single atomic batch: write the project doc and mutate both gallery projects
        // arrays. arrayUnion/arrayRemove are atomic at the field level on the server,
        // so concurrent shares to the same gallery accumulate rather than clobber.
        const batch = writeBatch(firestore);
        batch.set(
            doc(firestore, ProjectsCollection, projectID),
            updated.asPersisted().serialize(),
        );
        batch.update(doc(firestore, GalleriesCollection, galleryID), {
            projects: arrayUnion(projectID),
        });
        if (oldGalleryID !== null && oldGalleryID !== galleryID) {
            batch.update(doc(firestore, GalleriesCollection, oldGalleryID), {
                projects: arrayRemove(projectID),
            });
        }
        // Mirror the membership locally so the UI updates immediately and the
        // (now dirty) gallery doc carries the change on replay.
        this.applyLocalProjectMembership(projectID, galleryID, oldGalleryID);

        // Route the commit through trackSave (fire-and-forget): it catches a
        // failure, surfaces a SaveError in the save-status dialog, and marks the
        // gallery dirty so flushUnsaved replays it. The old bare
        // `await track(commit())` could hang offline (a commit resolves only on
        // server ack), reject unhandled, and silently drop the share. The
        // project doc is the source of truth for membership, so mark its history
        // saved on success or re-persist it on failure. (A failed *move* doesn't
        // replay the old gallery's array-remove, but project.gallery — the
        // source of truth — stays correct.)
        const galleryName = this.accessibleGalleries
            .get(galleryID)
            ?.getName(this.database.Locales.getLocaleSet());
        void this.trackSave(galleryID, galleryName, batch.commit()).then(
            (ok) => {
                if (ok)
                    this.database.Projects.getHistory(projectID)?.markSaved();
                else this.database.Projects.saveSoon();
            },
        );
    }

    // Remove the project from the gallery that it's in.
    async removeProject(project: Project, galleryID: string | null) {
        if (firestore === undefined) return;

        const projectID = project.getID();
        const targetGalleryID = galleryID ?? project.getGallery();

        // Update the in-memory project to clear its gallery field (no persist; batched below).
        const editResult = await this.database.Projects.edit(
            project.withGallery(null),
            false,
            false,
            false,
            'immediate',
        );
        if (editResult !== undefined) return;

        const updated =
            this.database.Projects.getHistory(projectID)?.getCurrent();
        if (updated === undefined) return;

        // Same race-collapsing check as addProject: if a concurrent share ran after
        // our history edit, history.current will hold a non-null gallery and we
        // should yield to that newer call rather than overwriting it.
        if (updated.getGallery() !== null) return;

        // Atomic batch: clear project.gallery and remove from the gallery's projects array.
        const batch = writeBatch(firestore);
        batch.set(
            doc(firestore, ProjectsCollection, projectID),
            updated.asPersisted().serialize(),
        );
        if (targetGalleryID !== null) {
            batch.update(doc(firestore, GalleriesCollection, targetGalleryID), {
                projects: arrayRemove(projectID),
            });
        }
        // See addProject. Fire-and-forget through trackSave so a failed/offline
        // removal is caught, surfaced, and replayable rather than hanging or
        // silently lost.
        if (targetGalleryID !== null) {
            this.applyLocalProjectMembership(projectID, null, targetGalleryID);
            const galleryName = this.accessibleGalleries
                .get(targetGalleryID)
                ?.getName(this.database.Locales.getLocaleSet());
            void this.trackSave(
                targetGalleryID,
                galleryName,
                batch.commit(),
            ).then((ok) => {
                if (ok)
                    this.database.Projects.getHistory(projectID)?.markSaved();
                else this.database.Projects.saveSoon();
            });
        } else {
            // No gallery doc in the batch — it's just the project write; let the
            // project's own persistence replay it on failure.
            void this.database
                .track(batch.commit())
                .then(() =>
                    this.database.Projects.getHistory(projectID)?.markSaved(),
                )
                .catch(() => this.database.Projects.saveSoon());
        }
    }

    // Remove the project from whatever gallery it is in, but only the project side
    // (used by gallery deletion, where the gallery doc itself is about to be deleted).
    async removeProjectFromGallery(project: Project) {
        await this.database.Projects.edit(
            project.withGallery(null),
            false,
            true,
            false,
            'immediate',
        );
    }

    /**
     * Reflect a project's gallery-membership change in the local accessibleGalleries
     * cache and notify any project listeners. Avoids waiting on the realtime listener
     * to round-trip from the server.
     */
    private applyLocalProjectMembership(
        projectID: string,
        addedTo: string | null,
        removedFrom: string | null,
    ) {
        if (addedTo !== null) {
            const cached = this.accessibleGalleries.get(addedTo);
            if (cached) {
                const updated = cached.withProject(projectID);
                this.accessibleGalleries.set(addedTo, updated);
                this.listeners
                    .get(projectID)
                    ?.forEach((listener) => listener(updated));
            }
        }
        if (removedFrom !== null && removedFrom !== addedTo) {
            const cached = this.accessibleGalleries.get(removedFrom);
            if (cached) {
                const updated = cached.withoutProject(projectID);
                this.accessibleGalleries.set(removedFrom, updated);
                this.listeners
                    .get(projectID)
                    ?.forEach((listener) => listener(updated));
            }
        }
    }

    // Remove the given creator from the gallery, and all of their projects.
    async removeCreator(gallery: Gallery, uid: string) {
        await this.removeCreatorOrCurator(gallery, uid, 'creators');
    }

    // Remove the given curator from the gallery, and all of their projects.
    async removeCurator(gallery: Gallery, uid: string) {
        await this.removeCreatorOrCurator(gallery, uid, 'curators');
    }

    /**
     * Shared implementation for removing a creator or curator from a gallery.
     * Atomically:
     *   - clears `gallery` on every project in the gallery owned by uid,
     *   - removes those project IDs from the gallery's `projects` array,
     *   - removes uid from the gallery's `creators` or `curators` array.
     *
     * Uses arrayRemove on both the projects array and the role array, so
     * concurrent additions to either by other writers (e.g., another student
     * sharing a new project while this removal runs) aren't clobbered.
     */
    private async removeCreatorOrCurator(
        gallery: Gallery,
        uid: string,
        role: 'creators' | 'curators',
    ) {
        if (firestore === undefined) return;

        // Identify the projects in the gallery whose owner is uid; those will
        // have their `gallery` field cleared. Projects owned by anyone else
        // stay where they are.
        const projectsToRemove: string[] = [];
        for (const projectID of gallery.getProjects()) {
            try {
                const project = await this.database.Projects.get(projectID);
                if (project !== undefined && project.getOwner() === uid)
                    projectsToRemove.push(projectID);
            } catch (err) {
                console.error(err);
            }
        }

        const batch = writeBatch(firestore);
        for (const projectID of projectsToRemove) {
            batch.update(doc(firestore, ProjectsCollection, projectID), {
                gallery: null,
            });
        }
        const galleryUpdate: Record<string, unknown> = {
            [role]: arrayRemove(uid),
        };
        if (projectsToRemove.length > 0) {
            galleryUpdate.projects = arrayRemove(...projectsToRemove);
        }
        batch.update(
            doc(firestore, GalleriesCollection, gallery.getID()),
            galleryUpdate,
        );
        await this.database.track(batch.commit());

        // Mirror the gallery change in the local cache so the UI updates
        // immediately. Project history caches will refresh via the realtime
        // listener.
        const cached = this.accessibleGalleries.get(gallery.getID());
        if (cached) {
            let updated =
                role === 'creators'
                    ? cached.withoutCreator(uid)
                    : cached.withoutCurator(uid);
            for (const projectID of projectsToRemove)
                updated = updated.withoutProject(projectID);
            this.accessibleGalleries.set(gallery.getID(), updated);
        }
    }

    clean() {
        // Stop listening if we're unmounting.
        if (this.galleriesQueryUnsubscribe) this.galleriesQueryUnsubscribe();
    }
}
