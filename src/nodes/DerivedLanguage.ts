import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import type Language from '@nodes/Language';
import type Type from '@nodes/Type';

/** Derives the locale of a text/markup operation's result from its operands'
 *  locales, analogous to NumberType's UnitDeriver for units. */
export type LanguageDeriver = (
    left: Language | undefined,
    right: Language | undefined,
) => Language | undefined;

/** Resolve a type's locale field to a concrete `Language`: pass concrete
 *  locales through, and evaluate a deriver against its operation's operands.
 *  Shared by `TextType` and `FormattedType` so the two stay in lockstep. */
export function concreteLanguageOf(
    language: Language | LanguageDeriver | undefined,
    op: BinaryEvaluate | Evaluate | undefined,
    context: Context,
): Language | undefined {
    if (!(language instanceof Function)) return language;
    if (op === undefined) return undefined;
    return resolveDerivedLanguage(op, context, language);
}

/** The concrete locale of an operand type. `Type.concreteLanguage` returns
 *  undefined for everything except text and formatted text. */
function languageOf(
    type: Type | undefined,
    context: Context,
): Language | undefined {
    return type === undefined ? undefined : type.concreteLanguage(context);
}

/**
 * Resolve a `LanguageDeriver` against an operation's operand locales. Shared by
 * `TextType` and `FormattedType` so their derivation logic can't drift. Mirrors
 * the operand extraction in `NumberType.concreteUnit`: works for both the
 * operator form (`BinaryEvaluate`, left/right) and the method form (`Evaluate`,
 * the function's subject type + first input). Imports only types (no node
 * classes) at load time, avoiding a module-initialization cycle through
 * FormattedType — hence the `'left' in op` check and `Expression.getSubjectType`
 * rather than `instanceof`.
 */
export default function resolveDerivedLanguage(
    op: BinaryEvaluate | Evaluate,
    context: Context,
    deriver: LanguageDeriver,
): Language | undefined {
    let leftType: Type | undefined;
    let rightType: Type | undefined;
    if ('left' in op && 'right' in op) {
        // BinaryEvaluate: the operands are the left and right expressions.
        leftType = op.left.getType(context);
        rightType = op.right.getType(context);
    } else {
        // Evaluate: the closure is the function's subject (the receiver of a
        // method call, e.g. `x` in `x.f(y)`), and the first input is the other
        // operand. getSubjectType is undefined unless fun is a PropertyReference.
        leftType = op.fun.getSubjectType(context);
        rightType =
            op.inputs.length > 0 ? op.inputs[0].getType(context) : undefined;
    }
    return deriver(languageOf(leftType, context), languageOf(rightType, context));
}
