import type Project from '@db/projects/Project';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Docs from '@nodes/Docs';
import Evaluate from '@nodes/Evaluate';
import FormattedLiteral from '@nodes/FormattedLiteral';
import Input from '@nodes/Input';
import KeyValue from '@nodes/KeyValue';
import MapLiteral from '@nodes/MapLiteral';
import Match from '@nodes/Match';
import type Node from '@nodes/Node';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import { EQUALS_SYMBOL, NOT_EQUALS_SYMBOL } from '@parser/Symbols';

/**
 * Whether a piece of a project's text should be handed to a translator.
 *
 * Most text in a project is prose meant for a reader, but some of it is *data* —
 * a key name compared against a stream, a map key, an emoji standing in for a
 * picture. Translating those doesn't localize a program, it breaks it: the
 * literal gains a target-language option, the target locale becomes primary, and
 * the value the program compares against silently changes. That is what turned
 * Heart Attack's `key = 'ArrowLeft'` into an unplayable game when it was
 * translated into Chinese (#1276), and it is the same rule as #1228 — anything
 * that becomes code must not be localized.
 */
export function shouldTranslateText(
    node: Docs | FormattedLiteral | TextLiteral,
    project: Project,
): boolean {
    // Documentation and formatted literals are always prose.
    if (!(node instanceof TextLiteral)) return true;

    const text = node.getOptions()[0]?.getText() ?? '';

    // A literal with no letter in any script is a symbol, not prose — an emoji
    // face, a bullet, an arrow. Sending it invites the translator to invent a
    // word for it, which is how `Phrase('🫀')` becomes a word on the stage. The
    // same exclusion already applies to names.
    if (!/\p{L}/u.test(text)) return false;

    const root = project.getRoot(node);
    if (root === undefined) return true;
    const parent = root.getParent(node);

    // An operand of an equality comparison is a value being matched, not prose.
    // Only the direct parent counts, so `('a' + b) = c` still translates its
    // prose. The operator is identified by resolving the function and asking
    // its names rather than by matching the written symbol, because a locale
    // may write `=` with its own word — and every project's basis appends the
    // en-US fallback, so `=` is always among the names.
    if (
        parent instanceof BinaryEvaluate &&
        (parent.left === node || parent.right === node) &&
        isEquality(parent, project)
    )
        return false;

    // The thing a match compares, and the keys it compares against, are values
    // for the same reason.
    if (parent instanceof Match && parent.value === node) return false;
    if (parent instanceof KeyValue && parent.key === node) {
        const grandparent = root.getParent(parent);
        if (grandparent instanceof Match || grandparent instanceof MapLiteral)
            return false;
    }

    // An input whose expected type is literal text can't accept anything else.
    return !isLiteralTextInput(node, project);
}

/** Whether this binary evaluation is `=` or `≠`, whatever the locale calls it. */
function isEquality(evaluate: BinaryEvaluate, project: Project): boolean {
    const source = project.getSourceOf(evaluate);
    if (source === undefined) return false;
    const definition = evaluate.fun.resolve(project.getContext(source));
    if (definition === undefined) return false;
    return (
        definition.names.hasName(EQUALS_SYMBOL) ||
        definition.names.hasName(NOT_EQUALS_SYMBOL)
    );
}

/**
 * Whether this literal is an input to an evaluation that expects literal text,
 * which by definition won't accept an arbitrary translation. Unchanged in
 * behaviour from the filter this was lifted out of.
 */
function isLiteralTextInput(node: TextLiteral, project: Project): boolean {
    const root = project.getRoot(node);
    if (root === undefined) return false;
    const evaluates: Node[] = root
        .getAncestors(node)
        .filter((ancestor) => ancestor instanceof Evaluate);
    for (const evaluate of evaluates) {
        if (!(evaluate instanceof Evaluate)) continue;
        const source = project.getSourceOf(evaluate);
        if (source === undefined) continue;
        const context = project.getContext(source);
        const inputs = evaluate.getInputMapping(context);
        const input = inputs?.inputs.find(
            (mapping) =>
                mapping.given === node ||
                (mapping.given instanceof Input &&
                    mapping.given.value === node),
        );
        const types = input?.expected
            .getType(context)
            .getTypeSet(context)
            .list();
        if (
            types !== undefined &&
            types.some((type) => type instanceof TextType && type.isLiteral())
        )
            return true;
    }
    return false;
}
