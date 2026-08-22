import type { SerializedSourceCheckpoint } from '@db/projects/ProjectSchemas';

/**
 * The checkpoint being viewed, identified by its time rather than its position.
 * Auto-checkpointing appends, the size cap shifts off the front, and a remote
 * merge reorders, so an index silently comes to mean a different checkpoint —
 * or none at all, which is how deleting history crashed the view. `null` is
 * "now", the project's current sources.
 */
export type CheckpointAnchor = number | null;

/** Newest first — the order the chooser presents and steps through. */
export function getCheckpointOrder(
    history: SerializedSourceCheckpoint[],
): SerializedSourceCheckpoint[] {
    return history.toReversed();
}

/**
 * The position of the anchored checkpoint in the newest-first order, or -1 for
 * "now" and for an anchor whose checkpoint is gone. Times aren't strictly
 * unique — `unionHistory` dedupes on time plus first source code, so a merge
 * can keep two entries at the same millisecond — so this takes the first match,
 * making resolution deterministic rather than correct-by-uniqueness.
 */
export function getCheckpointIndex(
    history: SerializedSourceCheckpoint[],
    anchor: CheckpointAnchor,
): number {
    if (anchor === null) return -1;
    return getCheckpointOrder(history).findIndex((c) => c.time === anchor);
}

/** The anchored checkpoint, or undefined for "now" and for a vanished anchor. */
export function getCheckpoint(
    history: SerializedSourceCheckpoint[],
    anchor: CheckpointAnchor,
): SerializedSourceCheckpoint | undefined {
    const index = getCheckpointIndex(history, anchor);
    return index === -1 ? undefined : getCheckpointOrder(history)[index];
}

/**
 * The anchor for stepping `delta` positions through the newest-first order
 * (positive goes further back), clamped at the oldest end and resolving to
 * "now" past the newest. A vanished anchor steps from "now".
 */
export function stepCheckpoint(
    history: SerializedSourceCheckpoint[],
    anchor: CheckpointAnchor,
    delta: number,
): CheckpointAnchor {
    const order = getCheckpointOrder(history);
    const next = getCheckpointIndex(history, anchor) + delta;
    if (next < 0) return null;
    return order[Math.min(next, order.length - 1)]?.time ?? null;
}
