import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import Reference from '@nodes/Reference';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import TypeSet from '@nodes/TypeSet';
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

/**
 * The expression that decides a name's value, following names through their binds. Only
 * statement binds are followed: a function or structure input's value is a *default* a
 * caller may override, so its literal isn't what the name holds at a comparison. Bounded,
 * since binds may name each other — a conflict, not a parse error, so this still runs.
 */
function resolveToConstantLeaf(
    expression: Expression,
    context: Context,
    depth = 0,
): Expression {
    if (depth >= 16 || !(expression instanceof Reference)) return expression;
    const definition = expression.resolve(context);
    if (
        !(definition instanceof Bind) ||
        definition.value === undefined ||
        !(definition.getParent(context) instanceof Block)
    )
        return expression;
    return resolveToConstantLeaf(definition.value, context, depth + 1);
}

/**
 * The types a value must have to equal what this expression evaluates to, if we can name
 * them at all. Following names means a literal given a name narrows like the literal
 * written inline, the same way a check given a name guards like the check written inline.
 *
 * `exclusive` says whether these types may also be *subtracted*. A text literal with
 * several translations evaluates to only one of them — the reader's — so learning the
 * comparison was false rules out that one, and we can't tell statically which it was.
 * Subtracting all of them claimed more than we know.
 */
export function getEqualityTypes(
    expression: Expression,
    context: Context,
): { types: TypeSet; exclusive: boolean } | undefined {
    const leaf = resolveToConstantLeaf(expression, context);

    if (leaf instanceof TextLiteral) {
        const types: TextType[] = [];
        for (const translation of leaf.texts)
            if (
                translation.segments.length === 1 &&
                translation.segments[0] instanceof Token
            )
                types.push(TextType.make(translation.segments[0].getText()));
        // A translation that interpolates code isn't a literal, and one unknown
        // translation means we don't know what the literal evaluates to at all.
        if (types.length !== leaf.texts.length || types.length === 0)
            return undefined;
        return {
            types: new TypeSet(types, context),
            exclusive: types.length === 1,
        };
    }
    if (leaf instanceof NoneLiteral)
        return {
            types: new TypeSet([NoneType.make()], context),
            exclusive: true,
        };
    if (leaf instanceof NumberLiteral)
        return {
            types: new TypeSet(
                [new NumberType(leaf.number, leaf.unit)],
                context,
            ),
            exclusive: true,
        };
    return undefined;
}

/**
 * Narrow `current` to the types consistent with equalling `types`. Three tiers, because a
 * set may hold the literal type ('x'|'y'), only its general type (''|#), or neither:
 * prefer the literal, fall back to the general type, and if the value can't be what's
 * compared at all, narrow nothing.
 *
 * Never returns an empty set. An empty set becomes NeverType at the use site, which turns
 * one impossible branch into a cascade of errors about a program that is otherwise fine —
 * narrowing that reports errors on correct code is worse than not narrowing.
 */
export function narrowToEqual(
    current: TypeSet,
    types: TypeSet,
    context: Context,
): TypeSet {
    const exact = current.intersection(types, context);
    if (exact.size() > 0) return exact;
    const general = new TypeSet(
        types.list().map((type) => type.generalize(context)),
        context,
    );
    const broad = current.intersection(general, context);
    return broad.size() > 0 ? broad : current;
}
