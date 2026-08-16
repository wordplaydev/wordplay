/**
 * What the caret is inside, for deciding which characters the glyph inserter
 * should offer.
 *
 * The row used to show every insert command everywhere, which meant ten
 * pattern glyphs sat in it at all times even though outside a `⣿…⣿` literal
 * the tokenizer doesn't lex them as pattern syms at all — they fall through to
 * names and produce garbage. This is the small amount of context needed to
 * stop offering a character where it cannot mean anything.
 *
 * **The rule is: hide only what the tokenizer or parser would refuse.** Where
 * a character merely looks unlikely, show it anyway — hiding a button someone
 * wanted is worse than showing a spare one.
 *
 * Two independent readings serve that. The lexical ones below say what *can be
 * written* here at all, which is what keeps the pattern atoms out of ordinary
 * code. {@link expectedTypeAt} says what would *fit* here, which is what keeps
 * a `⊤` out of a note list. Only a couple of dozen grammar fields declare an
 * expected type, so the second is silent at most positions — and silence means
 * show it.
 */

import type Project from '@db/projects/Project';
// Type-only, matching Paste.ts: we only call methods on the passed Caret, so
// this stays erased and can't form a cycle back through Commands.
import type Caret from '@edit/caret/Caret';
import Evaluate from '@nodes/Evaluate';
import Node from '@nodes/Node';
import PatternLiteral from '@nodes/PatternLiteral';
import { Sym } from '@nodes/Sym';
import type Type from '@nodes/Type';

/** Where the caret is, as far as inserting a character is concerned. */
export type InsertContext = {
    /** Inside a `⣿…⣿` literal, where the pattern glyphs are the only syntax. */
    readonly pattern: boolean;
    /** Right after a number, where a unit may be written. */
    readonly unit: boolean;
    /** Inside a @Track's note list or a @Note, where note values mean something. */
    readonly noteList: boolean;
};

/** Everything shown; what an inserter with no caret to consult falls back to. */
export const AnyContext: InsertContext = {
    pattern: false,
    unit: false,
    noteList: false,
};

/** The node closest to the caret, for ancestor walks. */
export function caretAnchor(caret: Caret): Node | undefined {
    if (caret.position instanceof Node) return caret.position;
    if (typeof caret.position === 'number')
        return caret.tokenIncludingSpace ?? caret.tokenExcludingSpace;
    return caret.source.getTokenAt(caret.position[0]);
}

/** Whether the caret sits inside a pattern literal `⣿…⣿`. */
export function caretIsInPattern(caret: Caret): boolean {
    const anchor = caretAnchor(caret);
    return (
        anchor !== undefined &&
        caret.source.root
            .getSelfAndAncestors(anchor)
            .some((node) => node instanceof PatternLiteral)
    );
}

/**
 * Whether a unit could be written where the caret is: immediately after a
 * number, with nothing between.
 *
 * This mirrors `parseNumber`, which attaches a unit only when the next token
 * is a name with no preceding space. There is no node to consult, because the
 * position we care about is the one where a unit does not exist yet.
 */
export function caretIsInUnit(caret: Caret): boolean {
    const prior = caret.getTokenPrior();
    return (
        caret.atTokenEnd() === true &&
        prior !== undefined &&
        prior.isSymbol(Sym.Number)
    );
}

/**
 * Whether the caret sits in a @Track's note list, or in a @Note — the two
 * places a note value written as a unit is read.
 *
 * Resolved through `getInput` rather than `getInputDefinition`, which compares
 * the given expression by identity and so misses both the named-input form
 * (`notes: […]`) and variable-length inputs.
 */
export function caretIsInNotes(project: Project, caret: Caret): boolean {
    const anchor = caretAnchor(caret);
    if (anchor === undefined) return false;

    const Track = project.shares.output.Track;
    const Note = project.shares.output.Note;
    const root = caret.source.root;
    const context = project.getContext(caret.source);

    for (const node of root.getSelfAndAncestors(anchor)) {
        if (!(node instanceof Evaluate)) continue;
        // A ♪ carries a note value on its degree or its beat, so anywhere
        // inside one counts.
        if (node.is(Note, context)) return true;
        if (!node.is(Track, context)) continue;
        const notes = node.getInput(Track.inputs[0], context);
        const given = Array.isArray(notes) ? notes : notes ? [notes] : [];
        if (
            given.some(
                (input) => input === anchor || root.hasAncestor(anchor, input),
            )
        )
            return true;
    }
    return false;
}

/**
 * The type a value would have to have to go where the caret is, or undefined
 * when nothing in the grammar has an opinion.
 *
 * This is the same `Field.getType` hook the autocomplete menu filters on, read
 * on its own rather than by building a whole revision list. Only a couple of
 * dozen grammar fields define it, so undefined is the common answer and means
 * "no opinion" — never "nothing fits". The walk takes the innermost field that
 * does have one: a caret after `3` in `[1 2 3]` sits in a token, inside a
 * number, inside the list, and it is the list's `values` field that knows what
 * its items must be.
 */
export function expectedTypeAt(
    project: Project,
    caret: Caret,
): Type | undefined {
    const anchor = caretAnchor(caret);
    if (anchor === undefined) return undefined;
    const root = caret.source.root;
    const context = project.getContext(caret.source);
    let child: Node = anchor;
    for (const parent of root.getAncestors(anchor)) {
        const field = parent.getFieldOfChild(child);
        if (field?.getType !== undefined) {
            const value = parent.getField(field.name);
            const index = Array.isArray(value)
                ? value.indexOf(child)
                : undefined;
            return field.getType(context, index === -1 ? undefined : index);
        }
        child = parent;
    }
    return undefined;
}

/** What the caret is inside. Cheap enough to run whenever the caret settles,
 * but not per keystroke: the walk is over the ancestor chain and the parent
 * map is cached, while `getInputMapping` allocates on every call. */
export function getInsertContext(
    project: Project,
    caret: Caret | undefined,
): InsertContext {
    if (caret === undefined) return AnyContext;
    const pattern = caretIsInPattern(caret);
    return {
        pattern,
        // A pattern body has no numbers with units, so don't pay for either
        // of these when we already know we're in one.
        unit: !pattern && caretIsInUnit(caret),
        noteList: !pattern && caretIsInNotes(project, caret),
    };
}
