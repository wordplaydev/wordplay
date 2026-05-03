import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import type ListAccess from '@nodes/ListAccess';
import type Node from '@nodes/Node';
import type PropertyReference from '@nodes/PropertyReference';
import type Reference from '@nodes/Reference';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';

export default function getGuards(
    reference: Reference | PropertyReference | ListAccess | SetOrMapAccess,
    context: Context,
    conditionCheck: (node: Node) => boolean,
) {
    return (
        context
            .getRoot(reference)
            ?.getAncestors(reference)
            ?.filter(
                (a): a is Conditional | BinaryEvaluate =>
                    // Guards must be conditionals
                    (a instanceof Conditional &&
                        // Don't include conditionals whose condition contain this; that would create a cycle
                        !a.condition.contains(reference) && // Some node in the condition must satisfy the given check
                        a.condition
                            .nodes()
                            .some((node) => conditionCheck(node))) ||
                    (a instanceof BinaryEvaluate &&
                        a.isLogicalOperator(context) &&
                        a.right.nodes().some((node) => conditionCheck(node))),
            )
            .reverse() ?? []
    );
}
