import Bind from '@nodes/Bind';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import Input from '@nodes/Input';
import NoneType from '@nodes/NoneType';
import Reference from '@nodes/Reference';
import { Sym } from '@nodes/Sym';
import type Type from '@nodes/Type';

/**
 * A bare name among an {@link Evaluate}'s inputs that fills a boolean input of that name.
 * `implicit` means the name resolves to nothing in scope, so it stands in for ⊤; otherwise it
 * names a boolean in scope and passes that value through.
 */
export type InputShorthand = { bind: Bind; implicit: boolean };

/**
 * Whether a bare boolean name can fill a slot of this type: `?`, or a union whose members are
 * all `?` or `ø`. The union case is not an edge case — `Phrase.flipx` is `?|ø`, so an
 * `instanceof BooleanType` test alone would decline the second most common flag in the corpus.
 */
export function isBooleanish(type: Type, context: Context): boolean {
    const possible = type.getPossibleTypes(context);
    return (
        possible.some((possibility) => possibility instanceof BooleanType) &&
        possible.every(
            (possibility) =>
                possibility instanceof BooleanType ||
                possibility instanceof NoneType,
        )
    );
}

/**
 * The function input a bare `Reference` among an `Evaluate`'s inputs fills by name, if any.
 *
 * The name decides *which* input is filled; scope decides only the *value*. A name that resolves
 * to something other than a boolean is not a shorthand at all and keeps its positional meaning,
 * which is what keeps this from changing any program that already parsed.
 */
export default function getInputShorthand(
    reference: Reference,
    context: Context,
    /** The parent evaluate, when the caller already has it in hand. */
    evaluate?: Evaluate,
): InputShorthand | undefined {
    // A reference built with an explicit definition already knows what it means.
    if (reference.definition !== undefined) return undefined;

    // Only a written name can be a shorthand; an operator or a placeholder never is.
    if (!reference.name.isSymbol(Sym.Name) || reference.isPlaceholder())
        return undefined;

    const parent = evaluate ?? context.getRoot(reference)?.getParent(reference);
    if (!(parent instanceof Evaluate)) return undefined;

    // Membership in `inputs`, not mere parenthood: `getFunction` below asks `fun` for its type,
    // so asking this of `fun` itself would recurse through `Reference.computeType` forever.
    const index = parent.inputs.indexOf(reference);
    if (index < 0) return undefined;

    const fun = parent.getFunction(context);
    if (fun === undefined) return undefined;

    const name = reference.getName();
    const bind = fun.inputs.find((input) => input.hasName(name));
    // A rest input takes a sequence of values, so a flag it isn't.
    if (bind === undefined || bind.isVariableLength()) return undefined;
    if (!isBooleanish(bind.getType(context), context)) return undefined;

    // An explicit named input wins over a shorthand, and among bare names the first wins.
    // Comparing names rather than recursing on siblings is exact here: two same-named bare
    // references in one scope resolve identically, so they are both shorthands or neither.
    for (const [otherIndex, other] of parent.inputs.entries()) {
        if (other instanceof Input && bind.hasName(other.getName()))
            return undefined;
        if (
            otherIndex < index &&
            other instanceof Reference &&
            bind.hasName(other.getName())
        )
            return undefined;
    }

    // Last, and only now, the scope walk. `Reference.resolve` is lexical-only by design — see
    // its comment — which is what keeps this from recursing back through the callers that
    // consult this predicate when resolution has already failed.
    const definition = reference.resolve(context);
    if (definition === undefined) return { bind, implicit: true };

    // An enclosing property reference puts the subject type's own members in scope for
    // everything inside it — `PropertyReference.getDefinitions` — so in `Phrase('hi' x).y` a
    // bare input name resolves to the very input it fills. That is not a value the evaluator
    // can resolve at the call site, so it means ⊤ here just as it would anywhere else; reading
    // it as a pass-through would compile a name lookup that fails at runtime.
    if (fun.inputs.some((input) => input === definition))
        return { bind, implicit: true };
    // Only a bound value can be passed through; a function or structure of this name is not a
    // boolean, so the reference keeps its positional meaning.
    return definition instanceof Bind &&
        isBooleanish(definition.getType(context), context)
        ? { bind, implicit: false }
        : undefined;
}

/**
 * The input a bare reference stands in for with an implicit ⊤, if any. Separate from the
 * general predicate because this is the only form that changes what a `Reference` *means*, and
 * so the only one `Reference` itself needs to ask about.
 */
export function getImplicitInputBind(
    reference: Reference,
    context: Context,
): Bind | undefined {
    const shorthand = getInputShorthand(reference, context);
    return shorthand?.implicit ? shorthand.bind : undefined;
}

/**
 * The inputs of `evaluate`'s function that could be written as a bare name in `anchor`'s place:
 * boolean, not variable length, not already given, and not already ⊤ by default (where the
 * shorthand would change nothing). `anchor` is the name being typed, so whatever it currently
 * fills doesn't count as filling anything.
 */
export function getShorthandCandidates(
    evaluate: Evaluate,
    anchor: Reference,
    context: Context,
): Bind[] {
    const fun = evaluate.getFunction(context);
    if (fun === undefined) return [];
    const mapping = evaluate.getInputMapping(context);
    if (mapping === undefined) return [];
    return fun.inputs.filter((bind) => {
        if (bind.isVariableLength()) return false;
        if (!isBooleanish(bind.getType(context), context)) return false;
        // Nothing to suggest for an input whose default is already ⊤.
        if (bind.value instanceof BooleanLiteral && bind.value.bool())
            return false;
        const given = mapping.inputs.find(
            (input) => input.expected === bind,
        )?.given;
        return given === undefined || given === anchor;
    });
}
