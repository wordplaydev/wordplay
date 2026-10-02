import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Bind from '#nodes/Bind.ts';
import Conditional from '#nodes/Conditional.ts';
import type Context from '#nodes/Context.ts';
import type Expression from '#nodes/Expression.ts';
import type ListAccess from '#nodes/ListAccess.ts';
import Match from '#nodes/Match.ts';
import type Node from '#nodes/Node.ts';
import type PropertyReference from '#nodes/PropertyReference.ts';
import Reference from '#nodes/Reference.ts';
import type SetOrMapAccess from '#nodes/SetOrMapAccess.ts';
import { logicalLeaves } from '#nodes/typeGuards.ts';

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
                (a): a is Conditional | BinaryEvaluate | Match =>
                    // Guards must be conditionals
                    (a instanceof Conditional &&
                        // Don't include conditionals whose condition contain this; that would create a cycle
                        !a.condition.contains(reference) && // Some node in the condition must satisfy the given check
                        checks(a.condition, new Set())) ||
                    // `&` and `|` short-circuit, so the right only evaluates once the
                    // left has been decided — which makes the LEFT the check and the
                    // right what it narrows. Testing the right instead only worked
                    // because every binary operator reports that it guards types, so a
                    // reference under any operator counted; one used as a plain
                    // argument (`h(a)`) did not.
                    (a instanceof BinaryEvaluate &&
                        a.isLogicalOperator(context) &&
                        !a.left.contains(reference) &&
                        checks(a.left, new Set())) ||
                    // A match decides on its subject the way a conditional decides on
                    // its condition, so it can narrow inside its cases and fallback.
                    (a instanceof Match &&
                        !a.value.contains(reference) &&
                        checks(a.value, new Set())),
            )
            .reverse() ?? []
    );
}
