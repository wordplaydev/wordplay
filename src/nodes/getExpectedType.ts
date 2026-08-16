import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Input from '@nodes/Input';
import Is from '@nodes/Is';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import Type from '@nodes/Type';

/**
 * The type an expression is declared to be by whatever it's given to, if anything declares one.
 *
 * Only declarations are consulted — never an inferred type — so that asking for an expression's
 * expected type can never depend on that expression's own type, and so can't cycle. Used by
 * {@link ListLiteral} to decide whether to take a type per position.
 */
export default function getExpectedType(
    expression: Expression,
    context: Context,
): Type | undefined {
    const root = context.getRoot(expression);
    const parent = root?.getParent(expression);
    if (root === undefined || parent === undefined) return undefined;

    // A bind with a declared type, e.g. `pair•[# '']: [1 'hi']`.
    if (parent instanceof Bind && parent.value === expression)
        return parent.getSpecifiedType();

    // A type check, e.g. `[1 'hi']•[# '']`.
    if (parent instanceof Is) return parent.type;

    // A function's declared output type, e.g. `ƒ pair()•[# ''] [1 'hi']`.
    if (parent instanceof FunctionDefinition)
        return parent.output instanceof Type ? parent.output : undefined;

    // The value of a block or a conditional is the value of the expression inside it, so whatever
    // is expected of them is expected of it.
    if (parent instanceof Block && parent.getLast() === expression)
        return getExpectedType(parent, context);
    if (parent instanceof Conditional && parent.yes === expression)
        return getExpectedType(parent, context);
    if (parent instanceof Conditional && parent.no === expression)
        return getExpectedType(parent, context);

    // An input to an evaluation, named (`Input`) or positional.
    const given = parent instanceof Input ? parent : expression;
    const evaluate = parent instanceof Input ? root.getParent(parent) : parent;
    if (evaluate instanceof Evaluate)
        return evaluate
            .getInputMapping(context)
            ?.inputs.find((input) => input.given === given)
            ?.expected.getSpecifiedType();

    // An item of another list, e.g. `pairs•[[# ''] [# '']]: [[1 'a'] [2 'b']]`.
    if (parent instanceof ListLiteral) {
        const type = getExpectedType(parent, context);
        return type instanceof ListType
            ? type.getTypeAt(parent.values.indexOf(expression))
            : undefined;
    }

    return undefined;
}
