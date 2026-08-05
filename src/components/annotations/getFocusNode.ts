import type { Resolution } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

/**
 * The node that revealing a conflict should select: the focus node one of its resolutions names, when
 * one does, and otherwise the conflict's own node. An explain-kind resolution uses `focusNode` to point
 * at where the learner has to act by hand, which can be somewhere other than the node the conflict is
 * reported on.
 */
export default function getFocusNode(
    resolutions: readonly Resolution[],
    fallback: Node,
): Node {
    for (const resolution of resolutions)
        if (resolution.kind === 'explain' && resolution.focusNode !== undefined)
            return resolution.focusNode;
    return fallback;
}
