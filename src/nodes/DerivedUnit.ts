import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type Type from '@nodes/Type';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import Unit from '@nodes/Unit';

/** Derives the unit of an operation's result from its operands' units. */
export type UnitDeriver = (
    left: Unit,
    right: Unit | undefined,
    constant: number | undefined,
) => Unit;

/**
 * Resolve a `UnitDeriver` against an operation's operand units. Extracted from
 * `NumberType.concreteUnit` so `RangeType` derives units by the same rules rather
 * than duplicating them — a range's bounds carry a unit exactly as a number does.
 *
 * Operands are read through `Type.concreteUnit`, not by testing for `NumberType`,
 * which is what lets a range-typed left operand (as in `(1m‥3m) ∋ 2m`) resolve
 * instead of falling back to the "any unit" wildcard and skipping the check.
 *
 * Imports only types apart from `Unit`, avoiding a module-initialization cycle,
 * hence the `'left' in op` shape tests rather than `instanceof`.
 */
export default function resolveDerivedUnit(
    op: BinaryEvaluate | UnaryEvaluate | Evaluate,
    context: Context,
    deriver: UnitDeriver,
    /** Reads a number literal operand's value, for derivers that scale by a constant.
     *  Passed in so this module needn't import NumberLiteral or NumberValue. */
    constantOf: (
        type: BinaryEvaluate | UnaryEvaluate | Evaluate,
    ) => number | undefined,
): Unit {
    let leftType: Type | undefined;
    let rightType: Type | undefined;
    let unary = false;
    if ('left' in op && 'right' in op) {
        // BinaryEvaluate: the operands are the left and right expressions.
        leftType = op.left.getType(context);
        rightType = op.right.getType(context);
    } else if ('input' in op) {
        // UnaryEvaluate: one operand, and no right to require.
        leftType = op.input.getType(context);
        unary = true;
    } else {
        // Evaluate: the closure is the function's subject (the receiver of a method
        // call, e.g. `x` in `x.f(y)`), and the first input is the other operand.
        leftType = op.fun.getSubjectType(context);
        rightType =
            op.inputs.length > 0 ? op.inputs[0].getType(context) : undefined;
    }

    // Stay lenient when an operand carries no unit of its own, matching the prior
    // behavior of skipping the check entirely for an unresolved derived unit.
    const left = leftType?.concreteUnit(context);
    if (left === undefined) return Unit.Any;
    const right = rightType?.concreteUnit(context);
    if (!unary && right === undefined) return Unit.Any;

    return deriver(left, right, constantOf(op));
}
