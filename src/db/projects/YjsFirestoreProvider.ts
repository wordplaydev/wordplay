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
        yDoc.on('update', updateHandler);
        this.detachLocal = () => yDoc.off('update', updateHandler);

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
        if (this.paused) return;
        const merged = Y.mergeUpdatesV2
            ? Y.mergeUpdatesV2(this.pendingUpdates)
            : this.pendingUpdates[0];
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
            console.error('YjsFirestoreProvider publish failed', err);
            // Re-queue so we retry on the next flush.
            this.pendingUpdates.unshift(merged);
            this.scheduleFlush();
        }
    }

    /** Stop publishing and unsubscribe from the subcollection. */
    stop(): void {
        if (this.stopped) return;
        this.stopped = true;
        this.detachLocal();
        if (this.flushTimer !== undefined) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }
        if (this.unsubscribe !== undefined) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
    }
}
