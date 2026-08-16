import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type ListAccess from '@nodes/ListAccess';
import type Node from '@nodes/Node';
import type PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import { logicalLeaves } from '@nodes/typeGuards';

export default function getGuards(
    reference: Reference | PropertyReference | ListAccess | SetOrMapAccess,
    context: Context,
    conditionCheck: (node: Node) => boolean,
) {
    /**
     * True if the condition contains a node satisfying the caller's check, or names a
     * bind whose value (recursively) does. Following names is what lets a check held
     * in a bind guard — `ok: map{key} ≠ ø` used as `ok ? …` — just as the same check
     * written inline does (#1285). Only the names that *decide* the condition are
     * followed, not every name in it: `game.phase = 2` names `game` as a subject, and
     * following that would make any bind whose value happens to contain a check
     * somewhere guard everything. `expanded` bounds the search, since binds may name
     * each other — a conflict, not a parse error, so this still has to terminate.
     */
    function checks(condition: Expression, expanded: Set<Bind>): boolean {
        if (condition.nodes().some(conditionCheck)) return true;
        return logicalLeaves(condition, context).some((leaf) => {
            if (!(leaf instanceof Reference)) return false;
            const definition = leaf.resolve(context);
            if (
                !(definition instanceof Bind) ||
                definition.value === undefined ||
                expanded.has(definition)
            )
                return false;
            expanded.add(definition);
            return checks(definition.value, expanded);
        });
    }

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
                        checks(a.condition, new Set())) ||
                    (a instanceof BinaryEvaluate &&
                        a.isLogicalOperator(context) &&
                        checks(a.right, new Set())),
            )
            .reverse() ?? []
    );
}
