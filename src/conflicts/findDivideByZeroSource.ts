import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import walkTypeSources from '@conflicts/walkTypeSources';

/**
 * If the ø in `given`'s type traces back to a `÷`/`%` whose divisor could be
 * zero, return that operation. Callers use it to explain a none-mismatch as a
 * possible divide-by-zero and to target the `??` fix at the division. Walks
 * type-source dependencies, so it finds the division even through binds and a
 * reaction's recurrence (e.g. `head + 1` → `(head + 1) % count`).
 *
 * The divide-by-zero test lives on the node ({@link Expression.isPossibleDivideByZero})
 * so this helper needn't import BinaryEvaluate — keeping it free of the
 * node↔conflict import cycle that core nodes participate in.
 */
export default function findDivideByZeroSource(
    given: Expression,
    context: Context,
): Expression | undefined {
    for (const { node } of walkTypeSources(given, context))
        if (node.isPossibleDivideByZero(context)) return node;
    return undefined;
}
