import { FirebaseError } from 'firebase/app';
import {
    addDoc,
    collection,
    onSnapshot,
    type Firestore,
    type Unsubscribe,
} from 'firebase/firestore';
import * as Y from 'yjs';
import ProjectCRDT, {
    base64ToBytes,
    bytesToBase64,
} from '@db/projects/ProjectCRDT';
import { ProjectsCollection } from '@db/projects/ProjectsDatabase.svelte';

/** Debounce window (ms) for batching consecutive keystrokes into a single
 *  Firestore write. Wide enough to fold a burst of typing into one update
 *  doc; narrow enough to feel live. */
const UPDATE_DEBOUNCE_MS = 200;

/** Schema for one update doc inside `projects/{id}/updates/{updateId}`. */
type UpdateDoc = {
    /** Base64 of the binary Yjs update bytes. */
    bytes: string;
    /** Writer ID — used to filter own writes when re-reading the
     *  subcollection (the local Y.Doc has already applied them). */
    writer: string;
    /** Monotonic counter from the writer's session, useful for ordering
     *  ties on identical server timestamps. */
    seq: number;
    /** ms-since-epoch from the writer at publish time. */
    sentAt: number;
};

/**
 * Realtime synchronization between a local ProjectCRDT and a Firestore
 * subcollection of update docs. Each local Y.Doc update is debounced and
 * appended as a new doc to `projects/{id}/updates`. Each remote doc is
 * applied to the local Y.Doc, filtered by writer to avoid re-applying
 * the local replica's own writes.
 *
 * Lifecycle is managed by ProjectsDatabase: created when CRDT activates,
 * stopped when CRDT deactivates or the project is deleted.
 */
export default class YjsFirestoreProvider {
    private readonly db: Firestore;
    private readonly projectID: string;
    private readonly crdt: ProjectCRDT;
    private readonly writer: string;

    private unsubscribe: Unsubscribe | undefined = undefined;
    private pendingUpdates: Uint8Array[] = [];
    private flushTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    private seqCounter = 0;
    private stopped = false;
    private paused = false;

    /** Set true after a publish returns `permission-denied`. The Firestore
     *  rule for `/updates` create only admits owners + collaborators, so a
     *  viewer/commenter (or any session whose auth state lags behind the
     *  project's contributor list) sees every flush rejected. Retrying
     *  spams the console and burns quota — once we've learned the answer
     *  is "no", drop further publishes silently. The snapshot listener
     *  keeps running so the user still sees peers' edits arrive. */
    private writeForbidden = false;

    /** Update bytes we just published — used to skip re-applying our own
     *  writes when they come back through the snapshot listener. */
    private ownDocIDs: Set<string> = new Set();

    constructor(
        db: Firestore,
        projectID: string,
        crdt: ProjectCRDT,
        writer: string,
    ) {
        this.db = db;
        this.projectID = projectID;
        this.crdt = crdt;
        this.writer = writer;
        this.attach();
    }

    private attach(): void {
        // Local → remote: queue every non-remote Y.Doc update for publish.
        const yDoc = this.getYDoc();
        const updateHandler = (update: Uint8Array, origin: unknown): void => {
            if (origin === 'remote') return;
            if (this.stopped) return;
            this.pendingUpdates.push(update);
            this.scheduleFlush();
        };
        // V2 format throughout — the encode/apply/merge calls below
        // are all V2, so we must listen on `updateV2` not `update`.
        // See the comment in ProjectCRDT's constructor for the
        // RangeError this mismatch produces.
        yDoc.on('updateV2', updateHandler);
        this.detachLocal = () => yDoc.off('updateV2', updateHandler);

        // Remote → local: subscribe to the updates subcollection.
        this.unsubscribe = onSnapshot(
            collection(
                this.db,
                ProjectsCollection,
                this.projectID,
                'updates',
            ),
            (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type !== 'added') continue;
                    const id = change.doc.id;
                    if (this.ownDocIDs.has(id)) {
                        this.ownDocIDs.delete(id);
                        continue;
                    }
                    const data = change.doc.data() as UpdateDoc;
                    if (data.writer === this.writer) continue;
                    try {
                        this.crdt.applyRemoteUpdate(base64ToBytes(data.bytes));
                    } catch (err) {
                        console.error(
                            'Failed to apply remote Yjs update',
                            err,
                        );
                    }
                }
            },
            (err) => {
                console.error('YjsFirestoreProvider snapshot error', err);
            },
        );
    }

    private detachLocal: () => void = () => undefined;

    /** Access the underlying Y.Doc via Yjs's exported helper — we
     *  intentionally keep this as a method so tests can stub it. */
    private getYDoc(): Y.Doc {
        // The CRDT owns its Y.Doc; we get at it through encodeStateVector +
        // a temporary Y.Doc isn't sufficient because we need the actual
        // doc instance for the update event. Surface it via the
        // already-public `applyRemoteUpdate` indirectly: we use the
        // event-driven approach instead.
        //
        // Since ProjectCRDT.applyLocalEdit transacts inside the same
        // Y.Doc, listening on Y.Doc 'update' is correct.
        //
        // We can't reach into ProjectCRDT's private field; instead, we
        // use a Yjs-level reflection: ProjectCRDT exposes
        // onChange() for materialized text and applyRemoteUpdate for
        // bytes. For now, treat ProjectCRDT as a black box by tapping
        // its internals through a tiny accessor — added below.
        return this.crdt.getInternalDoc();
    }

    private scheduleFlush(): void {
        // Refuse to schedule after stop() — otherwise an addDoc failure
        // during the final flush would re-queue and re-schedule, firing
        // after the provider was supposed to be torn down. Also refuse
        // once we've learned this session can't write; further attempts
        // would just rediscover the same permission-denied error.
        if (this.stopped || this.writeForbidden) return;
        if (this.flushTimer !== undefined) return;
        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            void this.flush();
        }, UPDATE_DEBOUNCE_MS);
    }

    /** Pause or resume publishing. Used by ProjectsDatabase to suspend
     *  this provider while the local user is waiting for an editing slot
     *  at the concurrent-editor cap — their local edits accumulate in
     *  pendingUpdates and flush as soon as a slot opens. */
    setPaused(paused: boolean): void {
        const wasPaused = this.paused;
        this.paused = paused;
        if (wasPaused && !paused && this.pendingUpdates.length > 0) {
            this.scheduleFlush();
        }
    }

    private async flush(): Promise<void> {
        if (this.pendingUpdates.length === 0) return;
        if (this.paused || this.writeForbidden) return;
        // Y.mergeUpdatesV2 is always available; the previous ternary
        // silently dropped tail updates when it was misconfigured.
        const merged = Y.mergeUpdatesV2(this.pendingUpdates);
        this.pendingUpdates = [];
        const payload: UpdateDoc = {
            bytes: bytesToBase64(merged),
            writer: this.writer,
            seq: this.seqCounter++,
            sentAt: Date.now(),
        };
        try {
            const ref = await addDoc(
                collection(
                    this.db,
                    ProjectsCollection,
                    this.projectID,
                    'updates',
                ),
                payload,
            );
            this.ownDocIDs.add(ref.id);
        } catch (err) {
            // permission-denied is terminal: the Firestore rule will say
            // no for every subsequent attempt this session, so retrying
            // just spams the console and burns quota. Drop the pending
            // bytes, mark the provider write-forbidden, and stay
            // subscribed for incoming updates so the user still sees
            // peers' edits.
            if (
                err instanceof FirebaseError &&
                err.code === 'permission-denied'
            ) {
                this.writeForbidden = true;
                this.pendingUpdates = [];
                console.warn(
                    'YjsFirestoreProvider: write denied by Firestore rules; ' +
                        'further local edits will not publish for this session.',
                );
                return;
            }
            console.error('YjsFirestoreProvider publish failed', err);
            // Transient error — re-queue and retry on the next flush.
            this.pendingUpdates.unshift(merged);
            this.scheduleFlush();
        }
    }

    /**
     * Stop publishing and unsubscribe from the subcollection.
     *
     * Before tearing down we flush any pending updates that the
     * debounce timer hadn't gotten to yet. Without this, a user
     * navigating away from a project within the 200ms publish window
     * after a keystroke would silently drop those updates on the
     * floor for connected peers — the local Y.Doc still has the
     * edits and {@link ProjectsDatabase.deactivateCRDT} persists the
     * snapshot, so they're not lost from the project itself, but
     * peers actively viewing this project would not see them through
     * the realtime subcollection listener until the next time someone
     * triggered a snapshot read. Flushing closes that gap.
     *
     * When `paused` is true (the local user was waiting for a
     * concurrent-editor slot and never got one), we deliberately do
     * NOT publish — the at-cap design says their edits shouldn't
     * escape the local replica. Those edits still survive locally
     * because they're in the Y.Doc and deactivateCRDT writes the
     * snapshot to the project doc, where peers will see them via
     * the next project-doc onSnapshot.
     */
    async stop(): Promise<void> {
        if (this.stopped) return;
        this.stopped = true;
        this.detachLocal();
        if (this.flushTimer !== undefined) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }
        if (this.pendingUpdates.length > 0 && !this.paused) {
            try {
                await this.flush();
            } catch (err) {
                console.error(
                    'YjsFirestoreProvider stop: final flush failed',
                    err,
                );
            }
        }
        if (this.unsubscribe !== undefined) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
    }
}
