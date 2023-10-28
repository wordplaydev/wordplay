import Conditional from './Conditional';
import type Context from './Context';
import type PropertyReference from './PropertyReference';
import type Reference from './Reference';
import type Node from './Node';

export default function getGuards(
    reference: Reference | PropertyReference,
    context: Context,
    conditionCheck: (node: Node) => boolean
) {
    return (
        context
            .getRoot(reference)
            ?.getAncestors(reference)
            ?.filter(
                (a): a is Conditional =>
                    // Guards must be conditionals
                    a instanceof Conditional &&
                    // Don't include conditionals whose condition contain this; that would create a cycle
                    !a.condition.contains(reference) &&
                    // Some node in the condition must satisfy the given check
                    a.condition.nodes().some((node) => conditionCheck(node))
            )
            .reverse() ?? []
    );
}
