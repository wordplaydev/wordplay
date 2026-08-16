import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import Reference from '@nodes/Reference';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import { NOT_SYMBOL } from '@parser/Symbols';

/**
 * The expressions that actually decide a condition, found by walking the logical
 * structure around them: parentheses, `~`, `&`, and `|`.
 *
 * This is what tells a name that stands in for the *check* (`ok ? …`, `~ok & b ? …`)
 * apart from a name used as a *subject* inside one (`game.phase = 2`). Only the
 * former may be followed to its definition: expanding a subject would make any bind
 * whose value happens to contain a check somewhere guard everything. (#1285)
 */
export function logicalLeaves(
    expression: Expression,
    context: Context,
    leaves: Expression[] = [],
): Expression[] {
    if (expression instanceof Block) {
        const last = expression.getLast();
        if (last instanceof Expression) logicalLeaves(last, context, leaves);
    } else if (
        expression instanceof UnaryEvaluate &&
        expression.getOperator() === NOT_SYMBOL
    )
        logicalLeaves(expression.input, context, leaves);
    else if (
        expression instanceof BinaryEvaluate &&
        expression.isLogicalOperator(context)
    ) {
        logicalLeaves(expression.left, context, leaves);
        logicalLeaves(expression.right, context, leaves);
    } else leaves.push(expression);
    return leaves;
}

/**
 * Whether this expression checks types — directly, or through the logical structure
 * and names around it, so `ok: (map{key} ≠ ø)` and an alias of it both count.
 * `expanded` bounds the search, since binds may name each other.
 */
export function checksTypes(
    expression: Expression,
    context: Context,
    expanded: Set<Bind> = new Set(),
): boolean {
    return logicalLeaves(expression, context).some((leaf) => {
        if (leaf.guardsTypes()) return true;
        if (!(leaf instanceof Reference)) return false;
        const definition = leaf.resolve(context);
        if (
            !(definition instanceof Bind) ||
            definition.value === undefined ||
            expanded.has(definition)
        )
            return false;
        expanded.add(definition);
        return checksTypes(definition.value, context, expanded);
    });
}
