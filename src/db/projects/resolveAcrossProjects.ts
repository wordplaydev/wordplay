import type Node from '@nodes/Node';
import type Project from '@db/projects/Project';

/**
 * Find the node in `to` that corresponds to the node with `nodeID` in `from`.
 *
 * `Node.id` is a global counter assigned when a node is constructed, and a
 * revision re-mints the replaced node's whole chain of ancestors, so the same
 * expression has a different ID in two versions of a project. Anything that
 * remembers a node across a revision therefore has to remember its *path*
 * instead — which is what the output selection already does.
 *
 * This exists for the one place that can't: the stage's `data-node-id`
 * attributes are written from the evaluator's project, while everything that
 * reads them looks the ID up in the current one. Those are the same project only
 * while the two are in step, and they aren't after a revise (the evaluator's
 * rebuild is deferred while the creator is typing). Without this, a click on
 * stage in that window finds nothing.
 *
 * Returns undefined when the node is gone from `to` — the edit deleted it, or
 * moved it somewhere the path no longer reaches.
 */
export default function resolveAcrossProjects(
    from: Project,
    to: Project,
    nodeID: number,
): Node | undefined {
    // Already the same namespace? Nothing to translate.
    const direct = to.getNodeByID(nodeID);
    if (direct !== undefined) return direct;

    const node = from.getNodeByID(nodeID);
    if (node === undefined) return undefined;

    const source = from.getSourceOf(node);
    if (source === undefined) return undefined;
    const index = from.getSources().indexOf(source);
    const path = from.getRoot(node)?.getPath(node);
    if (index < 0 || path === undefined) return undefined;

    return to.getSources()[index]?.root.resolvePath(path);
}
