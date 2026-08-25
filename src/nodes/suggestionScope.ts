import BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import UnaryEvaluate from '@nodes/UnaryEvaluate';

/**
 * The node whose scope a menu suggestion for a *neighbouring* field should be drawn from.
 *
 * Usually the anchor itself, but a binary or unary evaluate's `fun` is special: it resolves
 * against the left operand's type, so its scope is that type's members. Those are only valid in
 * the operator position, so offering them anywhere else produces an unknown name — filling the
 * empty right side of `1 + ` used to offer a bare `roundDown()`.
 */
export default function getSuggestionScope(anchor: Node, _: Context): Node {
    const parent = anchor.getParent(_);
    return (parent instanceof BinaryEvaluate ||
        parent instanceof UnaryEvaluate) &&
        anchor === parent.fun
        ? parent
        : anchor;
}
