import { PromisePool } from '@supercharge/promise-pool';
import { getFirestore } from 'firebase-admin/firestore';
import * as Y from 'yjs';

/**
 * Scheduled compaction of per-project realtime CRDT updates.
 *
 * Background — what a CRDT is, in two paragraphs:
 *   Wordplay's live coediting uses a Conflict-free Replicated Data Type
 *   from the Yjs library. Each collaborator's browser holds a local Y.Doc
 *   that contains a Y.Text per source file. When someone types, their
 *   Y.Doc emits a small binary "update" describing the change in a
 *   commutative way: applying updates in any order on any replica
 *   produces the same final document. That mathematical property is what
 *   lets us merge concurrent edits from two devices without a central
 *   coordinator and without "last write wins" clobbering.
 *
 *   The transport from one browser to another is Firestore: each update
 *   is appended as a doc under `projects/{id}/updates/{updateId}`, and
 *   every collaborator subscribes to that subcollection. Subscribing
 *   browsers apply each remote update to their local Y.Doc as it arrives
 *   (Y.applyUpdateV2). The catch is that this subcollection grows
 *   unboundedly — every keystroke is a doc. Without periodic compaction,
 *   it would inflate Firestore costs and slow down new-collaborator
 *   load (every new joiner would have to download every keystroke ever
 *   made).
 *
 * What this function does:
 *   For each project whose updates subcollection has accumulated at
 *   least {@link COMPACTION_THRESHOLD} docs, we:
 *     1) Read the project's current `crdt` snapshot (the merged binary
 *        Yjs state we last wrote to the parent doc, base64-encoded).
 *     2) Read a batch of update docs in causal order.
 *     3) Apply the snapshot and each update into a fresh Y.Doc — Yjs's
 *        commutativity guarantees this produces the same merged state
 *        every collaborator already sees in their own browser.
 *     4) Encode the merged state as a new snapshot, write it back to the
 *        project doc, and delete the consumed update docs in a single
 *        batch (transactionally, so a partial failure leaves no orphans).
 *
 * Concurrency: new updates that arrive *during* compaction stay in the
 * subcollection — we only delete the exact doc IDs we read. Browsers'
 * Y.Docs converge regardless, because Yjs's merge is commutative and
 * idempotent: re-applying a snapshot that already incorporates a given
 * update is a no-op for the doc's state.
 */

/** Below this many update docs we don't bother running — the cost of the
 *  read+write+delete batch dominates any storage savings. */
const COMPACTION_THRESHOLD = 50;

/** Cap on how many update docs we'll consume in one invocation, per
 *  project. Bounds memory and Firestore batch limits (500 ops/batch). */
const COMPACTION_BATCH = 400;

/** Cap on how many projects we'll compact in one invocation. We process
 *  the rest on the next tick rather than running until exhaustion. */
const PROJECTS_PER_TICK = 25;

/**
 * Base64 → Uint8Array. Functions run on Node, so `Buffer` is always
 * available — we don't need the browser fallback used in the client copy
 * of these helpers (see src/db/projects/ProjectCRDT.ts).
 */
function decode(b64: string): Uint8Array {
    return new Uint8Array(Buffer.from(b64, 'base64'));
}

function encode(bytes: Uint8Array): string {
    return Buffer.from(bytes).toString('base64');
}

export default async function compactProjectUpdates(): Promise<void> {
    const db = getFirestore();

    // Find projects that actively have collaborators — only these have a
    // CRDT subcollection worth compacting. We sample the field directly
    // off the parent doc rather than scanning all subcollections, which
    // is much cheaper.
    const candidates = await db
        .collection('projects')
        .where('collaborators', '!=', [])
        .limit(PROJECTS_PER_TICK * 4)
        .get();

    if (candidates.empty) return;

    // Compact up to PROJECTS_PER_TICK in parallel. Within each project the
    // work is sequential (read updates → merge → write snapshot → delete).
    const projectIDs: string[] = [];
    candidates.forEach((doc) => projectIDs.push(doc.id));

    await PromisePool.for(projectIDs.slice(0, PROJECTS_PER_TICK))
        .withConcurrency(3)
        .process(async (projectID) => {
            try {
                await compactOne(db, projectID);
            } catch (err) {
                console.error(
                    `compactProjectUpdates: project ${projectID} failed`,
                    err,
                );
            }
        });
}

async function compactOne(
    db: FirebaseFirestore.Firestore,
    projectID: string,
): Promise<void> {
    const projectRef = db.collection('projects').doc(projectID);
    const updatesRef = projectRef.collection('updates');

    // Fetch one batch of updates in causal order. Lexicographic doc-ID
    // ordering is the deterministic order the YjsFirestoreProvider relies
    // on; we preserve it here so applying the updates in this order
    // matches what every browser already did locally.
    const snap = await updatesRef
        .orderBy('__name__')
        .limit(COMPACTION_BATCH)
        .get();

    if (snap.size < COMPACTION_THRESHOLD) return;

    // Build the merged state by applying the existing snapshot plus all
    // updates into a single fresh Y.Doc. Yjs's mathematical property
    // (commutativity + idempotency of update application) guarantees we
    // end up at exactly the document state every browser already sees.
    const doc = new Y.Doc();
    const projectSnap = await projectRef.get();
    const data = projectSnap.data();
    const priorSnapshot =
        typeof data?.crdt === 'string' && data.crdt.length > 0
            ? data.crdt
            : null;
    if (priorSnapshot !== null) {
        Y.applyUpdateV2(doc, decode(priorSnapshot));
    }

    const consumed: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    snap.forEach((updateDoc) => {
        const bytes = updateDoc.data().bytes;
        if (typeof bytes !== 'string' || bytes.length === 0) return;
        try {
            Y.applyUpdateV2(doc, decode(bytes));
            consumed.push(updateDoc);
        } catch (err) {
            // A single corrupt update shouldn't poison the whole batch;
            // skip it and let the others compact. Leave the bad doc in
            // place so a human can investigate.
            console.error(
                `compactProjectUpdates: bad update ${projectID}/${updateDoc.id}`,
                err,
            );
        }
    });

    if (consumed.length === 0) return;

    const merged = encode(Y.encodeStateAsUpdateV2(doc));

    // One batch: update the snapshot field + delete the consumed updates.
    // Firestore caps a batch at 500 ops; COMPACTION_BATCH is set well
    // below that with one slot reserved for the parent update.
    const batch = db.batch();
    batch.update(projectRef, { crdt: merged });
    for (const updateDoc of consumed) batch.delete(updateDoc.ref);
    await batch.commit();
    console.log(
        `compactProjectUpdates: ${projectID} merged ${consumed.length} updates (snapshot ${merged.length} bytes)`,
    );
}
