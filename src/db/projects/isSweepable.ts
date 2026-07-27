/** What the cross-listener sweep knows about one locally-tracked project. */
export type SweepCandidate = {
    /** The project has been written to the cloud at least once. A project that
     *  has never been persisted has no server-side copy to have been deleted,
     *  so absence from the query results says nothing about it. */
    persisted: boolean;
    /** Some realtime listener's latest snapshot still matches this project. */
    matched: boolean;
    /** The local copy has edits that have not been confirmed saved. */
    unsaved: boolean;
    /** A live coediting session (Y.Doc) is open for this project. */
    editing: boolean;
};

/**
 * Whether the cross-listener sweep may delete a project's local copy.
 *
 * The sweep infers "this was removed server-side" from a project's absence in
 * every listener's results, and deletes the local copy to match. That inference
 * is only safe when the local copy holds nothing the cloud doesn't:
 *
 *   - **unsaved** — absence may simply mean the write hasn't landed (or failed,
 *     or happened offline). Deleting then discards the only copy of those edits.
 *     A later snapshot can still sweep it once its edits are saved.
 *   - **editing** — deleting tears down the session and destroys the Y.Doc,
 *     taking any edits not yet folded into the project with it, and yanks the
 *     project out from under someone who is looking at it.
 *
 * Erring toward keeping a local copy is deliberate. The cost of a wrong keep is
 * a stale project that gets swept on a later snapshot (or re-created in the
 * cloud by the next save); the cost of a wrong delete is unrecoverable work.
 */
export default function isSweepable(candidate: SweepCandidate): boolean {
    return (
        candidate.persisted &&
        !candidate.matched &&
        !candidate.unsaved &&
        !candidate.editing
    );
}
