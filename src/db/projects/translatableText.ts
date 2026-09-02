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
import { isSupportedCalendar } from '@locale/dateTimeFormats';
import { isSupportedTimeZone } from '@locale/timeZones';
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
    /** The project's compared text values (see {@link getComparedTextValues}),
     *  precomputed by the caller so a whole project pays for one walk. When
     *  given, a literal spelling one of them is data wherever it appears. */
    comparedValues?: Set<string>,
): boolean {
    // Documentation and formatted literals are always prose.
    if (!(node instanceof TextLiteral)) return true;

    const text = node.getOptions()[0]?.getText() ?? '';

    // A literal with no letter in any script is a symbol, not prose — an emoji
    // face, a bullet, an arrow. Sending it invites the translator to invent a
    // word for it, which is how `Phrase('🫀')` becomes a word on the stage. The
    // same exclusion already applies to names.
    if (!/\p{L}/u.test(text)) return false;

    // A value the program compares against somewhere is code everywhere: the
    // comparison operand itself is protected below, so translating the *other*
    // occurrences breaks the equality while leaving it looking intact.
    if (
        comparedValues !== undefined &&
        node.getOptions().some((option) => comparedValues.has(option.getText()))
    )
        return false;

    // An IANA time zone (`'Asia/Tokyo'`) or a calendar identifier
    // (`'japanese'`) is a name the platform knows, not a word: translating one
    // raises UnknownTimeZone/UnknownCalendar, which is how every localized
    // Clock lost the example in its own documentation. Decided by the same
    // validators the conflicts use, so this can never drift from them.
    if (isSupportedTimeZone(text) || isSupportedCalendar(text)) return false;

    return (
        !isComparedValue(node, project) && !isLiteralTextInput(node, project)
    );
}

/**
 * Whether this literal sits in a position the program treats as data: an
 * equality operand, a match subject or key, a map key.
 */
function isComparedValue(node: TextLiteral, project: Project): boolean {
    const root = project.getRoot(node);
    if (root === undefined) return false;
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
        return true;

    // The thing a match compares, and the keys it compares against, are values
    // for the same reason.
    if (parent instanceof Match && parent.value === node) return true;
    if (parent instanceof KeyValue && parent.key === node) {
        const grandparent = root.getParent(parent);
        if (grandparent instanceof Match || grandparent instanceof MapLiteral)
            return true;
    }

    return false;
}

/**
 * Every text value this project compares against somewhere: equality operands,
 * match subjects and keys, map keys. A literal spelling one of these is a code
 * value *everywhere* it appears, not just at the comparison: WhatWord assigns
 * `"playing"` to its status in one branch and asks `status ≠ "playing"` in
 * another, and translating the assignment while the protected comparison kept
 * its English silently breaks the game — the same failure as #1276, one step
 * removed. Callers pass the result back into {@link shouldTranslateText}.
 */
export function getComparedTextValues(project: Project): Set<string> {
    const values = new Set<string>();
    for (const source of project.getSources())
        for (const node of source.nodes())
            if (node instanceof TextLiteral && isComparedValue(node, project))
                for (const option of node.getOptions()) {
                    const text = option.getText();
                    if (text.length > 0) values.add(text);
                }
    return values;
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
