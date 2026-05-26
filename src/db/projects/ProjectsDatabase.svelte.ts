import { PossiblePII } from '@conflicts/PossiblePII';
import type Gallery from '@db/galleries/Gallery';
import { COPY_SYMBOL } from '@parser/Symbols';
import { type Observable } from 'dexie';
import { FirebaseError } from 'firebase/app';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    or,
    query,
    setDoc,
    where,
    writeBatch,
    type Unsubscribe,
} from 'firebase/firestore';
import { SvelteMap } from 'svelte/reactivity';
import { ExamplePrefix, getExample } from '../../examples/examples';
import type LocaleText from '@locale/LocaleText';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import { Galleries, Locales, SaveStatus, type Database } from '@db/Database';
import { firestore } from '@db/firebase';
import { EditFailure } from '@db/projects/EditFailure';
import { unknownFlags } from '@db/projects/Moderation';
import Project from '@db/projects/Project';
import ProjectCRDT, {
    base64ToBytes as decodeCRDTSnapshot,
} from '@db/projects/ProjectCRDT';
import { PresenceTracker } from '@db/projects/PresenceTracker.svelte';
import YjsFirestoreProvider from '@db/projects/YjsFirestoreProvider';
import {
    PersistenceType,
    ProjectHistory,
} from '@db/projects/ProjectHistory.svelte';
import {
    ProjectSchema,
    upgradeProject,
    type SerializedProject,
    type SerializedProjectUnknownVersion,
} from '@db/projects/ProjectSchemas';
import { ProjectsDexie } from '@db/projects/ProjectsDexie';

/** The name of the projects collection in Firebase */
export const ProjectsCollection = 'projects';

/**
 * Projects shouldn't be larger than 1,048,576 bytes, the Firestore document limit.
 */
export const MAX_PROJECT_BYTE_SIZE = 1048576;

export default class ProjectsDatabase {
    /** The database that manages this */
    readonly database: Database;

    /** An IndexedDB backed database of projects, allowing for scalability of local persistence. */
    readonly localDB = new ProjectsDexie();

    /** Wether this is in a browser with indexed db support */
    readonly IndexedDBSupported =
        typeof window !== 'undefined' && 'indexedDB' in window;

    /** The local live query that we listen to for cross-tab local changes */
    private editableProjects: Observable<SerializedProject[]> | undefined =
        undefined;

    /** An in-memory index of project histories by project ID. Populated on load, synced with local IndexedDB and cloud Firestore, when available. */
    private projectHistories: SvelteMap<string, ProjectHistory> =
        new SvelteMap();

    /** The latest versions of all projects */
    readonly currentProjects: Project[] = $derived(
        Array.from(this.projectHistories.values()).map((history) =>
            history.getCurrent(),
        ),
    );

    /** A store of all user editable projects stored in projectsDB. Derived from editable projects above. */
    readonly allEditableProjects: Project[] = $derived(
        this.currentProjects.filter((project) => {
            if (project.isArchived()) return false;
            const user = this.database.getUser();
            if (user === null || project.getOwner() === null) return true;
            if (project.isOwner(user.uid)) return true;
            if (project.hasCollaborator(user.uid)) return true;
            return false;
        }),
    );

    /** A store of all archived projects stored in projectsDB. Derived from editable projects above. */
    readonly allArchivedProjects: Project[] = $derived(
        this.currentProjects.filter((project) => project.isArchived()),
    );

    /** A cache of read only projects, by project ID. */
    readonly readonlyProjects: SvelteMap<string, Project | undefined> =
        new SvelteMap();

    /** Remember how to unsubscribe from the user's realtime query. */
    private projectsQueryUnsubscribe: Unsubscribe | undefined = undefined;

    /** Pending "Firestore is serving from cache" disconnect timer. Cleared if
     *  a fresh server snapshot arrives during the debounce window. */
    private fromCacheTimer: ReturnType<typeof setTimeout> | undefined =
        undefined;

    /** Debounce timer, used to clear pending requests. */
    private timer: NodeJS.Timeout | undefined = undefined;

    /** A list of listeners that are notified of a project change. */
    private listeners: Map<string, Set<(project: Project) => void>> = new Map();

    /** Active CRDT sessions, keyed by project ID. Stored in a
     *  {@link SvelteMap} so components reading via getProjectCRDT
     *  inside a $derived re-run when the entry is added — same
     *  reasoning as presenceTrackers below. Without this, anything
     *  that reads the CRDT reactively (e.g. RemoteCaretOverlay needs
     *  the Y.Text to decode peer carets) would cache `undefined` on
     *  the initial mount before activateCRDT runs. Disposed via
     *  {@link deactivateCRDT} when the project leaves the editor. */
    private projectCRDTs: SvelteMap<string, ProjectCRDT> = new SvelteMap();

    /** Active Firestore providers, one per CRDT session, that stream
     *  binary Yjs updates to and from `projects/{id}/updates`. Created
     *  alongside the CRDT in {@link activateCRDT}. */
    private crdtProviders: Map<string, YjsFirestoreProvider> = new Map();

    /** Active presence trackers, one per collaborative project. Exposes a
     *  reactive SvelteMap of remote peers' caret positions for the editor
     *  overlay to bind to.
     *
     *  Stored in a {@link SvelteMap} (not a plain Map!) because the
     *  RemoteCarets and RemoteCaretOverlay components read it from a
     *  $derived via getPresenceTracker. Svelte components mount and
     *  render *before* the parent's onMount runs, so RemoteCarets's
     *  first $derived evaluation happens before activateCRDT puts the
     *  tracker in this map. With a plain Map, that initial undefined
     *  read would be cached forever — RemoteCarets would never see
     *  the tracker get added and no chips would ever appear. SvelteMap
     *  fixes this: the .get() inside the $derived tracks the entry, so
     *  the later .set() inside activateCRDT triggers a re-derivation. */
    private presenceTrackers: SvelteMap<string, PresenceTracker> =
        new SvelteMap();

    /** Last-seen materialized code for each (projectID, sourceIndex), used
     *  to diff against the next save and emit precise Y.Text operations. */
    private lastCRDTCodes: Map<string, string[]> = new Map();

    /**
     * Per-tab session identifier. Stable for the lifetime of this
     * ProjectsDatabase instance (i.e., one tab). Distinct from
     * {@link Database.getWriterID} which is stored in localStorage and
     * therefore *shared* across tabs in the same browser.
     *
     * Used as:
     *   - the `writer` tag on CRDT update docs in
     *     YjsFirestoreProvider (so each tab can filter out its own
     *     writes from the realtime stream without filtering out
     *     other tabs of the same browser)
     *   - the `clientID` key on presence docs in PresenceTracker
     *     (so each tab gets its own presence doc and color, rather
     *     than two tabs overwriting one shared doc)
     *
     * Stamps in ProjectsDatabase.edit() keep using the per-device
     * writer — that's about authorship identity, not session
     * deduplication, and two tabs as the same user really do share
     * the same authorship for stamping purposes.
     */
    private readonly sessionID: string =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : typeof crypto !== 'undefined' &&
                  typeof crypto.getRandomValues === 'function'
                ? `s-${Array.from(crypto.getRandomValues(new Uint8Array(16)))
                      .map((byte) => byte.toString(16).padStart(2, '0'))
                      .join('')}-${Date.now().toString(36)}`
                : `s-${Date.now().toString(36)}`;

    /** True once the initial local-IndexedDB hydration has produced its
     *  first batch of projects (or determined there are none). Reactive
     *  — the /projects page binds to it to show a loading indicator
     *  during the brief window between mount and first emission. */
    hydrated: boolean = $state(false);

    constructor(database: Database) {
        this.database = database;

        // Hydrate the editable projects from disk
        this.hydrate();
    }

    async hydrate() {
        // Local DB support?
        if (this.IndexedDBSupported) {
            this.editableProjects = await this.localDB.getAllProjects();

            // If we got an observable from the local DB, and it knows how to give us a value, sync whenever it changes.
            if (this.editableProjects && this.editableProjects.getValue) {
                // Sync every time projects changes locally. The first
                // emission flips `hydrated` true so the /projects page
                // can stop showing its loading indicator. Subsequent
                // emissions (cross-tab updates) leave the flag alone.
                let firstEmission = true;
                this.editableProjects.subscribe((projects) => {
                    void this.trackLocal(projects).finally(() => {
                        if (firstEmission) {
                            firstEmission = false;
                            this.hydrated = true;
                        }
                    });
                });
            } else {
                // Observable didn't materialize — nothing to wait for.
                this.hydrated = true;
            }
        } else {
            // No IndexedDB at all (e.g. private-window mode in some
            // browsers). Nothing to hydrate; the page should show
            // whatever's in memory immediately.
            this.hydrated = true;
        }

        // We don't pull projects from the cloud. That's handled by syncUser() when the user changes.
    }

    async trackLocal(serialized: SerializedProject[]) {
        // Get all the projects from disk, deserialize them.
        const projects = await this.deserializeAll(serialized);

        // Don't persist back to the local database, since we just read them from disk.
        // If it's a tutorial project, mark it as local saves only.
        for (const project of projects) {
            this.track(
                project,
                true,
                project.isTutorial()
                    ? PersistenceType.Local
                    : PersistenceType.Online,
                true,
            );
        }
    }

    /** Call the given function when the project with the given ID is edited locally or remotely. */
    listen(projectID: string, listener: (project: Project) => void) {
        const current = this.listeners.get(projectID);
        if (current) current.add(listener);
        else this.listeners.set(projectID, new Set([listener]));
    }

    /** Stop calling the given function when the project with the given ID is edited locally or remotely */
    ignore(projectID: string, listener: (project: Project) => void) {
        const current = this.listeners.get(projectID);
        if (current) current.delete(listener);
    }

    /** Stop listening to this user's realtime project query. Safe to call when no query is active. */
    unmount() {
        if (this.projectsQueryUnsubscribe) {
            this.projectsQueryUnsubscribe();
            this.projectsQueryUnsubscribe = undefined;
        }
        if (this.fromCacheTimer !== undefined) {
            clearTimeout(this.fromCacheTimer);
            this.fromCacheTimer = undefined;
        }
    }

    async deserializeAll(serialized: unknown[]) {
        // Load all of the projects and their locale dependencies.
        return (
            await Promise.all(
                serialized.map((project) => this.parseProject(project)),
            )
        ).filter((project): project is Project => project !== undefined);
    }

    async deserialize(
        project: SerializedProjectUnknownVersion,
    ): Promise<Project | undefined> {
        return Project.deserialize(this.database.Locales, project);
    }

    /** When the user changes, update the realtime query for projects. */
    syncUser(remove: boolean) {
        // If we're supposed to remove local, do it before syncing the user.
        if (remove) this.deleteLocal();

        const user = this.database.getUser();

        // If there's no firestore access, do nothing.
        if (firestore === undefined) return;

        // Unsubscribe from the old user's realtime project query
        if (this.projectsQueryUnsubscribe) {
            this.projectsQueryUnsubscribe();
            this.projectsQueryUnsubscribe = undefined;
        }
        if (this.fromCacheTimer !== undefined) {
            clearTimeout(this.fromCacheTimer);
            this.fromCacheTimer = undefined;
        }

        // If there's no more user, do nothing.
        if (user === null) return;

        // Get the current list of galleries to watch.
        const galleryIDsToWatch = Array.from(
            Galleries.accessibleGalleries.keys(),
        );

        // Construct the query constraints. Visible projects are either owned by the user or shared with the user.
        const constraints = [
            where('owner', '==', user.uid),
            where('collaborators', 'array-contains', user.uid),
            where('commenters', 'array-contains', user.uid),
            where('viewers', 'array-contains', user.uid),
        ];

        // If the user has any gallery IDs it has access to, include those in the project query.
        if (galleryIDsToWatch.length > 0)
            constraints.push(where('gallery', 'in', galleryIDsToWatch));

        // Set up the realtime projects query for the user, tracking any projects from the cloud,
        // and deleting any tracked locally that didn't appear in the snapshot.
        // `includeMetadataChanges: true` lets us observe Firestore's connection
        // state passively via snapshot.metadata.fromCache.
        this.projectsQueryUnsubscribe = onSnapshot(
            query(
                collection(firestore, ProjectsCollection),
                or(...constraints),
            ),
            { includeMetadataChanges: true },
            async (snapshot) => {
                // Passive Firebase reachability detection. Server-fresh data
                // is the definitive "connected" signal. Cache fallback is only
                // a disconnect signal when there are NO pending local writes —
                // Firestore's latency compensation briefly serves cache during
                // any setDoc(), which would otherwise flash the banner. Even
                // then, debounce 2s so transient sync gaps don't trigger it.
                if (!snapshot.metadata.fromCache) {
                    if (this.fromCacheTimer !== undefined) {
                        clearTimeout(this.fromCacheTimer);
                        this.fromCacheTimer = undefined;
                    }
                    this.database.markFirebaseReachable();
                } else if (
                    !snapshot.metadata.hasPendingWrites &&
                    this.fromCacheTimer === undefined
                ) {
                    this.fromCacheTimer = setTimeout(() => {
                        this.database.markFirebaseDisconnected();
                        this.fromCacheTimer = undefined;
                    }, 2000);
                }

                // Metadata-only updates carry no doc changes; nothing else to do.
                if (snapshot.docChanges().length === 0) return;

                const serialized: unknown[] = [];
                const deleted: string[] = [];
                const projectIDs: Set<string> = new Set();

                // First, go through the entire set, gathering the latest versions and remembering what project IDs we know
                // so we can delete ones that are gone from the server.
                snapshot.forEach((doc) => {
                    const project = doc.data();
                    serialized.push(project);
                    projectIDs.add(project.id);
                });

                // Next, go through the changes and see if any were explicitly removed, and if so, delete them.
                snapshot.docChanges().forEach((change) => {
                    // Removed? Delete the local cache of the project.
                    if (change.type === 'removed') deleted.push(change.doc.id);
                });

                // Deserialize the projects and track them, if they're not already tracked.
                // Ensure the project is only tracked as editable if the user is the owner, collaborator, or curator.
                for (const project of await this.deserializeAll(serialized)) {
                    // The project is ediable i they are an owner, collaborator, or it is in a gallery for which they are curator.
                    const gallery = project.getGallery();
                    const editable =
                        project.isOwner(user.uid) ||
                        project.hasCollaborator(user.uid) ||
                        (gallery !== null &&
                            Galleries.accessibleGalleries
                                .get(gallery)
                                ?.hasCurator(user.uid) === true);

                    this.track(project, editable, PersistenceType.Online, true);
                }

                // Find all projects 1) known locally, 2) that didn't appear in latest update
                // 3) were previously marked as cloud persisted, and 4) aren't pending
                for (const [
                    projectID,
                    history,
                ] of this.projectHistories.entries())
                    if (
                        history.getCurrent().isPersisted() &&
                        !projectIDs.has(projectID)
                    )
                        deleted.push(projectID);

                // Delete the deleted if the data was from the server.
                if (!snapshot.metadata.fromCache)
                    for (const id of deleted) await this.deleteLocalProject(id);
            },
            (error) => {
                if (error instanceof FirebaseError) {
                    console.error(error.message);
                }
                this.database.markFirebaseDisconnected();
                this.database.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.projectsNotLoadingOnline,
                );
            },
        );

        // If we have a user, save the current database to the cloud, in case there
        // were any local edits.
        this.saveSoon();
    }

    /**
     * Duplicate a project and give it to the current user, returning it's ID.
     */
    duplicate(project: Project): Project {
        const nameExists = this.allEditableProjects.some(
            (p) => p.getName() === project.getName(),
        );
        const copy = project
            .copy(this.database.getUserID())
            .withName(
                nameExists
                    ? `${project.getName()} ${COPY_SYMBOL}`
                    : project.getName(),
            );
        this.track(copy, true, PersistenceType.Online, false);
        return copy;
    }

    /**
     * Given a project, track it in memory. If we already track it, update it if it's more recently edited than this project.
     *
     * @param project The project to cache and track
     * @param editable Whether the project should be editable or read only
     * @param persist Whether this change should be persisted to the local and cloud databases
     * */
    track(
        project: Project,
        editable: boolean,
        persist: PersistenceType,
        saved: boolean,
    ): ProjectHistory | undefined {
        if (editable) {
            // If we're not tracking this yet, create a history and store the version given.
            let history = this.projectHistories.get(project.getID());
            if (history === undefined) {
                // If the project has no owner, and there's a user, make this user the owner.
                const userID = this.database.getUserID();
                if (project.getOwner() === null && userID !== null)
                    project = project.withOwner(userID);

                // Make a new history and remember it, then save soon.
                history = new ProjectHistory(project, persist, saved, Locales);
                this.projectHistories.set(project.getID(), history);

                // Request a save.
                this.saveSoon();
            }
            // We already have this project in memory. Reconcile the
            // incoming version with what we have using the per-field
            // Lamport merge defined in Project.mergeWith. This is what
            // replaced the old "newer timestamp wins, overwrite the
            // rest" rule that produced bug #135: concurrent edits to
            // *different* fields now both survive (no more clobbered
            // renames on reconnect), and concurrent edits to the *same*
            // field converge deterministically across all replicas via
            // the Lamport counter + writer-ID tiebreak.
            //
            // When two replicas have just upgraded from v6 → v7 and
            // neither has touched a given field under v7 yet, the
            // stamps are NeverWritten on both sides. In that window
            // mergeWith falls back to the legacy timestamp comparison
            // so we don't lose pre-migration edits.
            else {
                const current = history.getCurrent();
                const merged = current.mergeWith(project);
                if (!merged.equals(current)) {
                    history.edit(merged, true);
                }
                // If live coediting is active for this project, also
                // fold the incoming remote CRDT snapshot into our
                // local Y.Doc. Yjs's binary update format is
                // commutative and idempotent — applying the remote
                // bytes converges the two replicas to the same source
                // text without coordination, even if the remote has
                // edits we don't yet know about and vice versa.
                this.foldRemoteCRDT(project);
            }

            // Activate or tear down the CRDT session based on whether the
            // Note: we do NOT activate the CRDT session here. The data-
            // layer merge for metadata (per-field stamps + timestamp
            // fallback) is already done by mergeWith above, which is
            // enough for projects the user isn't currently editing.
            // Spinning up a Y.Doc, Firestore listeners, and a presence
            // heartbeat for every one of a user's 50 projects would
            // burn bandwidth and quota for projects they aren't even
            // looking at. CRDT activation is driven by ProjectView's
            // mount/unmount instead — see {@link activateCRDT}.

            // Return the history
            return history;
        } else {
            this.readonlyProjects.set(project.getID(), project);
        }
    }

    /**
     * Light up the live-coediting machinery for this project.
     * Idempotent — a second call with the session already up is a
     * no-op. Called by ProjectView on mount, paired with
     * {@link deactivateCRDT} on unmount. Not called from {@link track}
     * because spinning up a Y.Doc + two Firestore listeners + a
     * heartbeat for *every* project a user has access to (often dozens)
     * is wasted bandwidth and quota; the merge for unviewed projects
     * is handled by per-field stamps alone via {@link mergeWith}.
     *
     * # Activation has three pieces
     *
     * 1. **ProjectCRDT** — wraps a Yjs Y.Doc holding one Y.Text per
     *    source. This is where local typing and remote updates meet
     *    and converge. Seeded from the project's last saved `crdt`
     *    snapshot if one exists; otherwise from the current plain-
     *    string source codes.
     * 2. **YjsFirestoreProvider** — the transport. Streams binary Yjs
     *    updates from the local Y.Doc to `projects/{id}/updates`
     *    (where peers pick them up via onSnapshot) and applies their
     *    updates to our local Y.Doc.
     * 3. **PresenceTracker** — broadcasts and subscribes to caret
     *    positions in a separate `projects/{id}/presence/{clientID}`
     *    subcollection. It also owns the live concurrent-editor cap:
     *    when our local user is waiting for a slot, the tracker calls
     *    `provider.setPaused(true)` so their local edits don't escape
     *    into the shared document until a slot opens.
     *
     * # Why we activate for every viewed project, even solo ones
     *
     * Wordplay's #135 bug is the offline-rename + online-code-edit
     * scenario. It bites *single users* on two devices just as hard
     * as it bites multi-user collaboration: device A renames offline,
     * device B types code online, A reconnects, and one of the edits
     * gets clobbered. Per-field stamps cover the metadata side of that
     * (name), but the code side needs the CRDT — character-level
     * convergence that doesn't lose either device's keystrokes.
     *
     * What's *not* universal is the UI: presence chips and remote
     * carets only appear when there are actual remote peers in the
     * tracker's map (see RemoteCarets.svelte and
     * RemoteCaretOverlay.svelte). A solo user editing alone sees no
     * collaborative chrome — they just get the corrupt-merge fix for
     * free.
     */
    activateCRDT(projectID: string): void {
        if (this.projectCRDTs.has(projectID)) return;
        const project = this.projectHistories.get(projectID)?.getCurrent();
        if (project === undefined) return;

        const sources = project.getSources();
        const codes = sources.map((s) => s.code.toString());
        const snapshot = project.getCRDTSnapshot();
        const crdt =
            snapshot !== null
                ? ProjectCRDT.fromSnapshot(snapshot)
                : ProjectCRDT.fromSources(codes);
        this.projectCRDTs.set(projectID, crdt);

        // Defensive: derive lastCRDTCodes from the CRDT's actual
        // content, NOT from project.sources[].code. Under well-behaved
        // persistence the two are identical — persist() writes both
        // from in-memory state that the bridge keeps in sync — but a
        // partially-failed save or any future code path that updates
        // one without the other would leave them disagreeing on
        // reload. If we anchored the diff baseline to source.code in
        // that case, the next local edit's applyCRDTDiff would compute
        // a delta against stale source.code and apply it to a Y.Text
        // that doesn't match, corrupting the document for everyone.
        //
        // Reading from the CRDT instead means applyCRDTDiff always
        // computes against what the Y.Text actually contains. The
        // user's edit may then produce a larger-than-strictly-necessary
        // delta (rewriting the divergent characters), but the result
        // is well-formed — the Y.Text ends at the user's intended
        // edited content, and peers converge cleanly. Bigger delta is
        // a much better failure mode than malformed text.
        //
        // We check `getKnownSourceIndices` rather than calling
        // `crdt.getCode(i)` blindly: getCode lazily creates an empty
        // Y.Text for any index it doesn't know about, which would
        // pollute the Y.Doc with placeholder texts for sources nobody
        // has edited yet.
        const known = new Set(crdt.getKnownSourceIndices());
        this.lastCRDTCodes.set(
            projectID,
            sources.map((_, i) => (known.has(i) ? crdt.getCode(i) : '')),
        );

        // Bridge Y.Doc → Project: when a remote peer's update arrives,
        // the provider applies it to the Y.Text inside this CRDT and
        // the Y.Doc fires `updateV2`. Without this listener the
        // Y.Text would silently advance while the editor kept
        // rendering the stale Source.code from the in-memory Project
        // — which is exactly the "edits don't propagate" symptom.
        //
        // We act only on origin='remote' updates so we don't echo our
        // own local edits (those are already in the Source the user
        // is typing in, and applyCRDTDiff put them in the Y.Text).
        crdt.onChange((sourceIndex, code, origin) => {
            if (origin !== 'remote') return;
            const history = this.projectHistories.get(projectID);
            if (history === undefined) return;
            const current = history.getCurrent();
            const sourcesNow = current.getSources();
            const source = sourcesNow[sourceIndex];
            if (source === undefined) return;
            if (source.code.toString() === code) return;

            // Build a new Source with the merged code, keeping the
            // existing names. Replace it in the project.
            const replaced = new Source(source.names, code);
            const merged = current.withSource(source, replaced);

            // Keep lastCRDTCodes in sync so the next *local* edit's
            // applyCRDTDiff diffs against the post-merge baseline
            // instead of re-applying a delete of the remote bytes.
            const tracked = this.lastCRDTCodes.get(projectID) ?? [];
            tracked[sourceIndex] = code;
            this.lastCRDTCodes.set(projectID, tracked);

            // Push the merged project into history *without* going
            // through ProjectsDatabase.edit, because edit would
            // re-bump stamps and re-call applyCRDTDiff (which would
            // see no diff and no-op, but it's clearer to skip the
            // whole pipeline for a CRDT-driven update). history.edit
            // updates the in-memory project; the parent route's
            // reactive derivation sees it and re-renders ProjectView
            // with the new source content.
            history.edit(merged, false, false);
        });
        // Stream realtime updates to/from Firestore. Skipped in
        // environments without firestore (SSR, tests with no firebase
        // emulator) — the CRDT still works locally.
        //
        // Both subsystems below take {@link sessionID} (per-tab), not
        // the per-device writer from Database.getWriterID. Two tabs in
        // the same browser share localStorage and therefore share the
        // per-device writer — if we used it here, the CRDT provider
        // would filter out the other tab's updates as its own, and the
        // presence tracker would write to a single shared presence doc
        // that both tabs treat as self. Per-tab IDs fix both.
        if (firestore !== undefined) {
            const provider = new YjsFirestoreProvider(
                firestore,
                projectID,
                crdt,
                this.sessionID,
            );
            this.crdtProviders.set(projectID, provider);

            // Spin up presence alongside the CRDT. The tracker
            // publishes our own caret/source and surfaces a reactive
            // map of remote peers for the editor's RemoteCarets
            // overlay to bind to. The tracker also owns the live
            // concurrent-editor cap: when our local user is waiting
            // for a slot, we pause the CRDT publisher so their local
            // edits don't escape.
            const tracker = new PresenceTracker(
                firestore,
                projectID,
                this.sessionID,
                // Pass a getter, not a snapshot. Firebase Auth's
                // IndexedDB hydration can land microseconds after
                // ProjectView mounts; capturing userID once here
                // would silently leave the tracker unable to publish
                // for the rest of the session.
                () => this.database.getUserID(),
            );
            tracker.onCapChange = (atCap) => provider.setPaused(atCap);
            this.presenceTrackers.set(projectID, tracker);
        }
    }

    /**
     * Tear down the live-coediting machinery for this project. Called
     * by ProjectView on unmount, paired with {@link activateCRDT}.
     * Idempotent — calling on a project with no active session is a
     * no-op. After this returns the project remains tracked (its
     * metadata still merges on remote updates via {@link mergeWith}),
     * but no Y.Doc, Firestore listeners, or presence heartbeat run
     * until the next activate.
     *
     * # The data-loss path this guards against
     *
     * Local typing applies edits to the in-memory Y.Doc immediately,
     * but two layers of debouncing sit between that and durable
     * Firestore storage:
     *   - The realtime subcollection update (~200ms debounce inside
     *     YjsFirestoreProvider — connected peers see edits this fast).
     *   - The project-doc snapshot (~1s debounce inside saveSoon —
     *     reloaders see edits this fast).
     *
     * If we naively destroyed the Y.Doc on unmount, a user who
     * navigated within those windows would lose edits that lived
     * only in the Y.Doc's memory. So before tearing down we:
     *
     *   1. **Synchronously** capture the Y.Doc's encoded state into
     *      the in-memory project's `crdt` field via history.edit. Two
     *      reasons for sync: (a) a rapid re-activate that fires before
     *      the await resolves will re-read the same project and
     *      seed its new Y.Doc from this fresh snapshot; (b) it marks
     *      the history as unsaved so the saveSoon kicked off below
     *      will actually write it.
     *   2. Remove from the activation maps, also synchronously, so a
     *      rapid re-activate creates fresh instances instead of
     *      grabbing torn-down ones.
     *   3. **Await** provider.stop() — flushes any queued realtime
     *      updates so connected peers see the edits via the
     *      subcollection instead of having to wait for our next
     *      snapshot to propagate through their project-doc listener.
     *   4. **Await** tracker.stop() — removes our presence doc.
     *   5. Schedule a soon-save (saveSoon) so the snapshot landed in
     *      step 1 reaches Firestore. The user navigating within the
     *      saveSoon window stays covered by the in-memory snapshot
     *      until the next save fires.
     *
     * Tab close before saveSoon fires is a pre-existing failure mode
     * that affects any unsaved project edits, not something specific
     * to CRDT — a beforeunload handler would be the fix.
     */
    /**
     * Install best-effort save-on-unload handlers so that local edits
     * survive the user closing the tab or backgrounding the app.
     *
     * # Why we need this
     *
     * Edits land in the in-memory ProjectHistory immediately, but two
     * debounce windows sit between the keystroke and Firestore:
     *
     *   - `saveSoon` debounces persist() by ~1s after the last edit.
     *   - Local CRDT edits live in the in-memory Y.Doc until the next
     *     persist() pulls them into the project doc's `crdt` snapshot
     *     via withCRDTSnapshot().
     *
     * If the user closes the tab inside either window the edits exist
     * only in the now-dead JavaScript heap. {@link deactivateCRDT}
     * covers the SPA-navigation case (ProjectView unmount), but it
     * doesn't fire on tab close — the user's component lifecycle is
     * cut short by the browser. That's what this handler is for.
     *
     * # What we do
     *
     * On `visibilitychange → hidden` and on `pagehide` (the two
     * events that fire reliably across desktop and mobile when the
     * page is going away), we:
     *
     *   1. Synchronously fold every active CRDT's current state into
     *      the in-memory project's `crdt` snapshot via history.edit.
     *      This marks the history as unsaved so step 2 picks it up.
     *   2. Fire persist() without awaiting. The Firestore SDK uses
     *      fetch keepalive under the hood, which the browser will
     *      try to flush even after the tab closes (no guarantee, but
     *      it's the best we can do without a beacon endpoint).
     *
     * # Limitations
     *
     * Tab kill on mobile, abrupt process termination, and `navigator
     * .sendBeacon`-less Firestore mean we can't guarantee delivery.
     * The visibility/pagehide pair plus fetch keepalive covers the
     * common cases — closing a desktop tab, switching apps on
     * mobile, hitting Back. Returns a cleanup that unregisters the
     * listeners; the root +layout.svelte's onMount calls this and
     * the returned cleanup runs on app unmount.
     */
    installSaveOnUnloadListeners(): () => void {
        if (typeof window === 'undefined') return () => undefined;

        const flush = (): void => {
            // Capture each active CRDT's Y.Doc state into the in-memory
            // project so the persist below picks it up via the
            // existing withCRDTSnapshot path. history.edit also marks
            // the history unsaved, which is what persist() filters on.
            for (const [id, crdt] of this.projectCRDTs) {
                const history = this.projectHistories.get(id);
                if (history === undefined) continue;
                try {
                    history.edit(
                        history
                            .getCurrent()
                            .withCRDTSnapshot(crdt.encode()),
                        false,
                        false,
                    );
                } catch (err) {
                    console.error(
                        'save-on-unload: snapshot capture failed',
                        err,
                    );
                }
            }
            // Fire-and-forget. We can't await — the page is going away.
            // Firestore's transport uses fetch keepalive, which the
            // browser will best-effort flush after unload.
            void this.persist();
        };

        const handleVisibility = (): void => {
            if (document.visibilityState === 'hidden') flush();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pagehide', flush);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pagehide', flush);
        };
    }

    async deactivateCRDT(projectID: string): Promise<void> {
        const crdt = this.projectCRDTs.get(projectID);
        const provider = this.crdtProviders.get(projectID);
        const tracker = this.presenceTrackers.get(projectID);

        // Step 1: synchronously hand the final snapshot to the
        // in-memory project so subsequent reads (and re-activates)
        // see it.
        if (crdt !== undefined) {
            const history = this.projectHistories.get(projectID);
            if (history !== undefined) {
                history.edit(
                    history.getCurrent().withCRDTSnapshot(crdt.encode()),
                    false,
                    false,
                );
            }
        }

        // Step 2: remove from activation maps synchronously so a
        // rapid re-activate doesn't see stale instances.
        this.projectCRDTs.delete(projectID);
        this.crdtProviders.delete(projectID);
        this.presenceTrackers.delete(projectID);
        this.lastCRDTCodes.delete(projectID);

        // Step 3: flush any queued realtime updates to peers.
        if (provider !== undefined) {
            try {
                await provider.stop();
            } catch (err) {
                console.error('deactivateCRDT: provider.stop failed', err);
            }
        }

        // Step 4: remove our presence doc.
        if (tracker !== undefined) {
            try {
                await tracker.stop();
            } catch (err) {
                console.error('deactivateCRDT: tracker.stop failed', err);
            }
        }

        // Destroy the Y.Doc — its state has already been captured.
        if (crdt !== undefined) crdt.destroy();

        // Step 5: kick off a save so the snapshot lands in Firestore.
        this.saveSoon();
    }

    /** Return the active presence tracker for this project, if any. The
     *  editor's RemoteCarets overlay binds to its reactive `peers` map. */
    getPresenceTracker(projectID: string): PresenceTracker | undefined {
        return this.presenceTrackers.get(projectID);
    }

    /** Returns the active ProjectCRDT for a project ID, or undefined when
     *  collaboration isn't active. Used by the realtime sync layer
     *  (Stage 3) and by tests. */
    getProjectCRDT(projectID: string): ProjectCRDT | undefined {
        return this.projectCRDTs.get(projectID);
    }

    /**
     * Fold an incoming remote project's CRDT snapshot into the active
     * local Y.Doc.
     *
     * # When this fires
     *
     * Every time Firestore hands us a remote copy of a project we're
     * already tracking — e.g. a peer just saved their changes and the
     * snapshot listener fires for us — we get to a fork in the road:
     * the metadata merge in {@link track} handles every field except
     * source code, and this method handles the source code.
     *
     * # Why we fold instead of overwrite
     *
     * The naive option would be "replace our local Y.Doc with the
     * remote snapshot." That would lose any local edits that haven't
     * been written to the cloud yet. Yjs gives us a better option:
     * its binary update format is *commutative* and *idempotent*, so
     * passing the remote snapshot through Y.applyUpdateV2 *merges*
     * the remote state into ours — both sides' edits survive,
     * regardless of which side has more recent changes.
     *
     * No-op when collaboration isn't active locally (no Y.Doc to fold
     * into) or when the remote has no snapshot to apply (it's still
     * a solo or never-promoted project on that side).
     */
    private foldRemoteCRDT(remote: Project): void {
        const crdt = this.projectCRDTs.get(remote.getID());
        if (crdt === undefined) return;
        const snapshot = remote.getCRDTSnapshot();
        if (snapshot === null || snapshot.length === 0) return;
        try {
            const bytes = decodeCRDTSnapshot(snapshot);
            crdt.applyRemoteUpdate(bytes);
        } catch (err) {
            console.error('Failed to fold remote CRDT snapshot', err);
        }
    }

    /** If a CRDT session is active for this project, return a copy of the
     *  project with `crdt` set to the current snapshot bytes. Otherwise
     *  returns the project unchanged. Called from persist() so saves
     *  always carry the latest Yjs state. */
    private withCRDTSnapshot(project: Project): Project {
        const crdt = this.projectCRDTs.get(project.getID());
        if (crdt === undefined) return project;
        return project.withCRDTSnapshot(crdt.encode());
    }

    /** When a CRDT session is active for the given project, apply the
     *  per-source code diff between the previously cached materialized
     *  text and this revision's text. This drives Y.Text mutations
     *  during normal editing without changing the editor's call sites. */
    private applyCRDTDiff(project: Project): void {
        const id = project.getID();
        const crdt = this.projectCRDTs.get(id);
        if (crdt === undefined) return;
        const codes = project.getSources().map((s) => s.code.toString());
        const previous = this.lastCRDTCodes.get(id) ?? [];
        for (let i = 0; i < codes.length; i++) {
            const oldCode = previous[i] ?? '';
            const newCode = codes[i];
            if (oldCode !== newCode)
                crdt.applyLocalEdit(i, oldCode, newCode, 'local');
        }
        this.lastCRDTCodes.set(id, codes);
    }

    /** Create a project and return it's ID */
    create(locales: LocaleText[], code = '', galleryID?: string) {
        const userID = this.database.getUserID();
        // Make the new project
        const newProject = Project.make(
            null,
            '',
            new Source(locales[0].term.start, code),
            [],
            // The project starts with all of the locales currently selected in the config.
            locales,
            // User owns the project
            userID,
            // No collaborators
            [],
            // Not public
            false,
            // No carets yet
            undefined,
            // Yes listed
            true,
            // Not archived
            false,
            // Not yet persisted
            false,
            // Optional gallery ID
            galleryID ?? null,
            // Unknown moderation state
            unknownFlags(),
        );

        // Track the new project, and request that it be persisted.
        this.track(newProject, true, PersistenceType.Online, false);

        // Return it's new ID
        return newProject.getID();
    }

    copy(project: Project, newOwner: string | null, gallery: string | null) {
        const clone = project.copy(newOwner).withGallery(gallery);

        this.track(clone, true, PersistenceType.Online, false);
        return clone.getID();
    }

    /** Returns the current version of the project with the given ID, if it exists. */
    async get(id: string): Promise<Project | undefined> {
        // First, check read only projects.
        const readonly = this.readonlyProjects.get(id);
        if (readonly) return readonly;

        // Is this an example? Load the example.
        if (id.startsWith(ExamplePrefix)) {
            const serialized = await getExample(id);
            const project = await (serialized === undefined
                ? undefined
                : Project.deserialize(this.database.Locales, serialized));
            this.readonlyProjects.set(id, project);
            return project;
        }

        // First, check memory. If it's in the local DB, it should be in memory.
        const project = this.projectHistories.get(id)?.getCurrent();
        if (project !== undefined) return project;

        // Not there? Check the local database. We may not have finished hydrating yet.
        if (this.IndexedDBSupported) {
            const localProject = await this.localDB.getProject(id);
            if (localProject !== undefined) {
                const proj = await this.deserialize(localProject);
                if (proj) {
                    this.track(
                        proj,
                        true,
                        proj.isTutorial()
                            ? PersistenceType.Local
                            : PersistenceType.Online,
                        false,
                    );
                    return proj;
                }
            }
        }

        // Not there? See if Firebase has it.
        if (firestore) {
            try {
                const projectDoc = await getDoc(
                    doc(firestore, ProjectsCollection, id),
                );
                if (projectDoc.exists()) {
                    const user = this.database.getUser();

                    const project = await this.parseProject(projectDoc.data());
                    if (project !== undefined) {
                        const galleryID = project.getGallery();
                        const isOwnerOrCollaborator =
                            user !== null &&
                            (project.isOwner(user.uid) ||
                                project.hasCollaborator(user.uid));
                        const gallery =
                            galleryID && !isOwnerOrCollaborator
                                ? await this.database.Galleries.get(galleryID)
                                : undefined;

                        this.track(
                            project,
                            isOwnerOrCollaborator ||
                                (user !== null &&
                                    gallery !== undefined &&
                                    gallery.hasCurator(user.uid)),
                            PersistenceType.Online,
                            false,
                        );
                    }
                    return project;
                }
            } catch (err) {
                return undefined;
            }
        }

        return undefined;
    }

    /**
     * Given a project that is assumed to be editable, find it's history, and then edit it.
     * @param project The revised project
     * @param remember If true, keeps the current version of the project in the history, otherwise replaces it.
     * @param persist If true, try to save the change to disk and the cloud
     * @param dynamic
     *
     * Returns true if the edit was successful, false if it was not.
     * */
    async edit(
        project: Project,
        remember: boolean,
        persist: boolean,
        dynamic: boolean = false,
        when: 'immediate' | 'soon' = 'soon',
    ): Promise<EditFailure | undefined> {
        if (project.getSourceByteSize() > MAX_PROJECT_BYTE_SIZE)
            return EditFailure.TooLarge;

        // Notify any listeners of this new project.
        this.listeners
            .get(project.getID())
            ?.forEach((listener) => listener(project));

        // Update or create a history for this project.
        const history = this.projectHistories.get(project.getID());
        if (history) {
            // Bump per-field stamps for every metadata field whose value
            // changed between the prior version and this one, tagged with
            // this device's writer ID. This is what makes the remote-side
            // merge in track() above pick the right side per field.
            const stamped = project
                .bumpStampsFrom(history.getCurrent(), this.database.getWriterID())
                .withNewTime();

            // If a CRDT session is active for this project, apply the
            // text diff between the prior code and the new code to each
            // source's Y.Text. The CRDT is the source of truth for code
            // while collaboration is live, and its snapshot will be
            // encoded into the project doc at persist() time.
            this.applyCRDTDiff(stamped);

            // Save the project with a new time.
            const success = history.edit(stamped, remember, dynamic);

            // If the save was successful, update the projects and persist if asked.
            if (success === true) {
                // Save according to the requested policy.
                if (persist)
                    if (when === 'immediate') await this.persist();
                    else this.saveSoon();

                return undefined;
            } else return EditFailure.Infinite;
        }
        // No history? Directly edit the project in the database, if connected and asked to save the edit.
        // This is likely an edit by a curator of a gallery, e.g., removing a project from a collection.
        else if (firestore && persist) {
            await this.database.track(
                setDoc(
                    doc(firestore, ProjectsCollection, project.getID()),
                    project.serialize(),
                ),
            );
            return undefined;
        }
        // Not editable? Return false.
        else return EditFailure.ReadOnly;
    }

    /**
     * Persist a freshly-extracted auto preview for the project. No-ops if
     * the project's current preview is `manual` (the user has pinned a
     * glyph), or if we have no editable history for this project (e.g. it's
     * a read-only public project we're only viewing — the caller should
     * keep the computed preview in component state instead). Called from
     * ProjectView's auto-update effect and from the on-demand preview
     * queue's editable-project success path.
     */
    setAutoPreview(
        id: string,
        extracted: {
            text: string;
            foreground: string | null;
            background: string | null;
            face: string | null;
            characterName: string | null;
        },
    ): void {
        const history = this.projectHistories.get(id);
        if (!history) return;
        const current = history.getCurrent();
        if (current.getPreview()?.mode === 'manual') return;
        this.edit(
            current.withPreview({ mode: 'auto', ...extracted }),
            false,
            true,
        );
    }

    /**
     * Pin a single-grapheme glyph as the project's preview. Manual previews
     * are never overwritten by the auto-update flow.
     */
    setManualPreview(id: string, text: string): void {
        const history = this.projectHistories.get(id);
        if (!history) return;
        const current = history.getCurrent();
        this.edit(
            current.withPreview({
                mode: 'manual',
                text,
                foreground: null,
                background: null,
                face: null,
                characterName: null,
            }),
            false,
            true,
        );
    }

    /**
     * Clear an existing manual preview, returning the project to auto mode.
     * The next ProjectView open or queued compute will repopulate the text.
     */
    clearManualPreview(id: string): void {
        const history = this.projectHistories.get(id);
        if (!history) return;
        const current = history.getCurrent();
        this.edit(current.withPreview(undefined), false, true);
    }

    /**
     * True if the current user can save changes to this project. Mirrors
     * the predicate used by ProjectPreview's `editable` derivation and by
     * the share dialog visibility rules.
     */
    isEditable(project: Project): boolean {
        const user = this.database.getUser();
        if (user === null) return false;
        return project.hasContributor(user.uid);
    }

    /** Archive/unarchive the project with the given ID, if it exists */
    async archiveProject(id: string, archive: boolean) {
        // For now, we don't actually delete projects, we just mark them archived.
        // This prevents accidental data loss.
        const history = this.projectHistories.get(id);
        if (history) {
            const current = history.getCurrent();

            // If the project is in a gallery, remove it.
            const gallery = current.getGallery();
            if (gallery)
                await this.database.Galleries.removeProject(current, gallery);

            // Mark the project archived after its removed from the gallery.
            this.edit(current.asArchived(archive), false, true);
        }
    }

    async deleteOwnedProjects() {
        // Delete all projects that this user owns.
        const ownerID = this.database.getUserID();
        for (const history of this.projectHistories.values())
            if (history.getCurrent().getOwner() === ownerID)
                await this.deleteProject(history.id);
        await this.deleteLocal();
    }

    /** Permanently delete this project from the local and cloud database. */
    async deleteProject(id: string) {
        // No firestore access? Bail.
        if (firestore === undefined) return;

        // Get the project
        const project = await this.get(id);
        if (project === undefined) return;

        // Remove the project from it's gallery.
        const gallery = project.getGallery();
        if (gallery)
            await this.database.Galleries.removeProject(project, gallery);

        // Delete the project doc
        await this.database.track(
            deleteDoc(doc(firestore, ProjectsCollection, id)),
        );

        // Delete the corresponding chat, if there is one.
        this.database.Chats.deleteChat(id);

        // Delete from the local cache.
        this.deleteLocalProject(id);
    }

    /** Delete project locally */
    async deleteLocalProject(id: string) {
        // Delete from the local cache.
        await this.localDB.deleteProject(id);

        // Untrack the project from both editable and read-only caches.
        this.projectHistories.delete(id);
        this.readonlyProjects.delete(id);

        // Tear down any active CRDT session and its Firestore provider.
        // Unlike deactivateCRDT we don't try to persist the snapshot —
        // the project is gone. The flush inside provider.stop() may end
        // up writing to a deleted project's subcollection, but the
        // compactor cleans up orphan updates and the security rules
        // would reject the write anyway after the parent doc deletion
        // propagates.
        const provider = this.crdtProviders.get(id);
        if (provider !== undefined) {
            void provider.stop();
            this.crdtProviders.delete(id);
        }
        const tracker = this.presenceTrackers.get(id);
        if (tracker !== undefined) {
            void tracker.stop();
            this.presenceTrackers.delete(id);
        }
        const crdt = this.projectCRDTs.get(id);
        if (crdt !== undefined) {
            crdt.destroy();
            this.projectCRDTs.delete(id);
            this.lastCRDTCodes.delete(id);
        }
    }

    /** Persist in storage */
    async persist() {
        // Note that we're saving.
        this.database.setStatus(SaveStatus.Saving, undefined);

        const userID = this.database.getUserID();

        // Before doing anything, ensure all editable projects that don't have an owner have one.
        for (const [, history] of this.projectHistories)
            if (history.getCurrent().getOwner() === null && userID !== null)
                history.edit(history.getCurrent().withOwner(userID), true);

        // Get all the editable projects, and separate them into local saves and online.
        const editable = Array.from(this.projectHistories.values());
        // Only save unsaved local projects.
        const local = editable.filter(
            (history) =>
                history.isUnsaved() &&
                (history.getPersisted() === PersistenceType.Local ||
                    history.getPersisted() === PersistenceType.Online),
        );
        const online = editable.filter(
            (history) => history.getPersisted() === PersistenceType.Online,
        );

        // First, save all projects to the local DB, including the user ID if they don't have it already.
        if (this.IndexedDBSupported) {
            this.database.setStatus(SaveStatus.Saving, undefined);
            try {
                this.localDB.saveProjects(
                    local.map((history) =>
                        this.withCRDTSnapshot(history.getCurrent()).serialize(),
                    ),
                );
            } catch (err) {
                console.error(err);
                this.database.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.projectsNotSavedLocally,
                );
            }
            this.database.setStatus(SaveStatus.Saved, undefined);
        } else {
            this.database.setStatus(
                SaveStatus.Error,
                (l) => l.ui.project.save.projectsCannotNotSaveLocally,
            );
        }

        // Then, try to save them in Firebase if we have a user ID.
        if (firestore && userID) {
            const unsaved = online.filter((history) => history.isUnsaved());
            /** Whether a project was not saved because it has PII. */
            let skipped = false;

            try {
                // Create a batch of the unsaved projects, remembering exactly
                // which version of each history we sent. We need this so that if
                // an edit lands during the await batch.commit() below, we don't
                // mistakenly mark the history as saved — that would clobber the
                // new edit's saved=false flag and the next saveSoon would skip it.
                const batch = writeBatch(firestore);
                const sentVersions = new Map<
                    (typeof unsaved)[number],
                    Project
                >();
                for (const history of unsaved) {
                    const current = history.getCurrent();

                    // Does the current one have any PII? If so, don't save it.
                    current.analyze();
                    if (
                        current
                            .getConflicts()
                            .some((conflict) => conflict instanceof PossiblePII)
                    ) {
                        skipped = true;
                        continue;
                    }

                    // Mark it as persisted, since we're about to save it that way.
                    const serialized = this.withCRDTSnapshot(
                        current.asPersisted(),
                    ).serialize();
                    batch.set(
                        doc(firestore, ProjectsCollection, serialized.id),
                        serialized,
                    );
                    sentVersions.set(history, current);
                }
                await this.database.track(batch.commit());

                // Only mark a history as saved if its current version is still
                // the exact one we just sent. If reviseProject() ran during the
                // await above, history.getCurrent() will point to a new object
                // (history.edit always assigns a fresh Project), and we leave
                // saved=false so the next saveSoon round picks up the change.
                for (const [history, sentVersion] of sentVersions) {
                    if (history.getCurrent() === sentVersion)
                        history.markSaved();
                }

                // Mark status as saved
                this.database.setStatus(
                    skipped ? SaveStatus.Error : SaveStatus.Saved,
                    skipped
                        ? (l) => l.ui.project.save.projectContainedPII
                        : undefined,
                );
            } catch (error) {
                if (error instanceof FirebaseError) {
                    console.error(error.code);
                    console.error(error.message);
                }
                this.database.setStatus(
                    SaveStatus.Error,
                    (l) => l.ui.project.save.projectNotSavedOnline,
                );
            }
        } else this.database.setStatus(SaveStatus.Saved, undefined);
    }

    /** Revise all editable projects to use the specified locales */
    localize(locales: LocaleText[]) {
        for (const [, history] of this.projectHistories)
            history.withLocales(locales);
    }

    /** Shorthand for revising nodes in a project */
    revise(project: Project, revisions: [Node, Node | undefined][]) {
        const newProject = project.withRevisedNodes(revisions);
        this.reviseProject(newProject);
        return newProject;
    }

    /** Replaces the project with the given project, adding the current version to the history, and erasing the future, if there is any. */
    reviseProject(
        revised: Project,
        remember = true,
        dynamic = false,
    ): Promise<EditFailure | undefined> {
        return this.edit(revised, remember, true, dynamic);
    }

    /** Gets the project history for the given project ID, if there is one. */
    getHistory(id: string) {
        return this.projectHistories.get(id);
    }

    /** Given a project ID and direction, undo or redo */
    async undoRedo(
        id: string,
        direction: -1 | 1,
    ): Promise<Project | undefined> {
        const history = this.projectHistories.get(id);
        // No record of this project? Do nothing.
        if (history === undefined) return undefined;

        // Try to undo/redo
        const project = await history.undoRedo(direction);

        if (project) {
            // history.undoRedo rolls the project state back, but the
            // Y.Doc still holds the pre-undo content (and lastCRDTCodes
            // still mirrors it). Without resyncing here, three things
            // break:
            //   1. The caret-encoder effect in Editor.svelte fires off
            //      the newly-restored $caret, encodes a Y.RelativePosition
            //      against the stale Y.Text, and broadcasts a caret
            //      anchored to content the peer can't reconcile with
            //      our visible source.
            //   2. The next local edit's applyCRDTDiff would diff the
            //      undone source against the still-pre-undo
            //      lastCRDTCodes, producing a delta that effectively
            //      re-applies what we undid.
            //   3. Peers in a live session would never see our undo —
            //      their Y.Doc keeps the edits we just rolled back.
            // applyCRDTDiff handles all three: it mutates the Y.Text
            // to match the post-undo source, refreshes lastCRDTCodes,
            // and the provider publishes the resulting update to peers.
            this.applyCRDTDiff(project);
            this.saveSoon();
        }

        return project;
    }

    /**
     * Trigger a save to local storage and the remote database at some point in the future.
     * Should be called any time this.projects is modified.
     */
    saveSoon() {
        // Clear pending saves.
        clearTimeout(this.timer);

        // Initiate another.
        this.timer = setTimeout(() => this.persist(), 1000);
    }

    /** Deletes the local database (usually on logout, for privacy), and removes any projects from memory. */
    async deleteLocal() {
        this.localDB.deleteAllProjects();
        this.projectHistories.clear();
    }

    /** Attempt to parse a seralized project into a project. */
    async parseProject(data: unknown): Promise<Project | undefined> {
        // If the project data doesn't parse, then return nothing, since it's not valid.
        try {
            // Assume it's a project of an unknown version and upgrade it.
            const serialized = upgradeProject(
                data as SerializedProjectUnknownVersion,
            );
            // Now parse it with Zod, verifying it complies with the schema.
            const project = ProjectSchema.parse(serialized);
            // Now convert it to an in-memory project so we can manipulate it more easily.
            return await this.deserialize(project);
        } catch (_) {
            console.error(_);
            return undefined;
        }
    }

    /** When a gallery changes, ensure that we respect access, tracking any projects that we aren't tracking yet, and stopping tracking projects we were tracking. */
    async refreshGallery(gallery: Gallery) {
        // Find all projects we're tracking that are no longer in the gallery, and remove them.
        for (const [projectID, history] of this.projectHistories.entries()) {
            const current = history.getCurrent();
            if (
                current.getGallery() === gallery.getID() &&
                !gallery.getProjects().includes(projectID)
            ) {
                this.deleteLocalProject(projectID);
            }
        }

        // Find all of the projects in the gallery that we're not tracking, and track them.
        for (const projectID of gallery.getProjects()) {
            if (!this.projectHistories.has(projectID)) {
                try {
                    const project = await this.get(projectID);
                    if (project) {
                        this.track(project, true, PersistenceType.Online, true);
                    }
                } catch (err) {
                    console.error(
                        'Unable to get the project in the gallery, even though the gallery was listed as containing the project.',
                    );
                }
            }
        }
    }
}
