/**
 * Decide whether {@link ProjectsDatabase.foldRemoteCRDT}'s case (b) should
 * replay a remote project doc's plain `sources[i].code` into the local Y.Doc.
 *
 * Case (b) exists for genuinely non-CRDT writers (Cloud Function rename,
 * admin-SDK rewrite, pre-v8 client) that update `code` without producing a
 * `crdt` snapshot. It must NOT fire for a CRDT-aware peer: the `crdt` snapshot
 * is the authoritative source of truth (the plain `code` is only a
 * backwards-compatibility view, see the v8 schema comment in ProjectSchemas),
 * and that materialized view can momentarily trail its own snapshot under
 * concurrent typing. Letting it replay would delete already-converged
 * characters from the Y.Doc — the live-coediting "dropped first character"
 * bug. So: only replay when the remote carries no CRDT snapshot, the folded
 * snapshot did not already move the source, and the remote is fresh enough not
 * to roll back unpublished local typing.
 *
 * Kept in a plain module (no Svelte/Firebase deps) so it is unit-testable in
 * isolation.
 */
export function shouldReplayRemotePlainCode(inputs: {
    remoteHasCRDT: boolean;
    snapshotChangedSource: boolean;
    fresh: boolean;
}): boolean {
    if (inputs.remoteHasCRDT) return false;
    if (inputs.snapshotChangedSource) return false;
    return inputs.fresh;
}
