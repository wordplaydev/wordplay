import type Caret from '@edit/caret/Caret';
import { isPosition, isRange } from '@edit/caret/Caret';
import Doc from '@nodes/Doc';
import Example from '@nodes/Example';
import type Markup from '@nodes/Markup';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import { DOCS_SYMBOL } from '@parser/Symbols';
import { withoutColorSelector } from '@unicode/emoji';

/**
 * The markup editor edits a markup string as a real {@link Source}, by wrapping it
 * in the doc delimiter (`¶…¶`) so it parses as a program whose only content is
 * documentation. That is the same wrapper {@link toMarkup} already uses, so the
 * editor inherits the app's markup parse semantics exactly, and it is what lets
 * the whole code editor — `Caret`, `RootView`, `CaretView`, the keyboard mirror —
 * operate on prose without a parallel model.
 *
 * Verified over 30,597 locale and tutorial strings and 108 how-to sources: the
 * wrapped source round-trips byte-identically, modulo the U+FE0F normalization the
 * tokenizer performs on all source. See markupSource.test.ts.
 */

/** The name given to the throwaway source a markup string is edited in. It is
 *  never shown: the editor renders the inner `Markup`, not the source. */
const MarkupSourceName = 'markup';

/** Wrap a markup string in `¶…¶` and parse it. */
export function markupToSource(text: string, name = MarkupSourceName): Source {
    return new Source(name, wrapMarkup(text));
}

/**
 * The `¶…¶`-wrapped form of a markup string.
 *
 * Deliberately unconditional, unlike `toMarkup`'s guard, which skips the wrapper
 * when the text already starts or ends with `¶`. That guard is what makes
 * `Hello ¶note¶` parse as an empty doc followed by code — the same shape behind
 * the how-to callout truncation — and an editor that lost text to it would lose
 * the creator's work. Wrapping always means {@link unwrapMarkup} is exact.
 */
export function wrapMarkup(text: string): string {
    return DOCS_SYMBOL + text + DOCS_SYMBOL;
}

/** The markup string a source holds, without the `¶` wrapper. The inverse of
 *  {@link markupToSource} for any string that round-trips. */
export function sourceToMarkup(source: Source): string {
    return unwrapMarkup(source.toWordplay());
}

/** Strip the one delimiter {@link wrapMarkup} added at each end. */
export function unwrapMarkup(code: string): string {
    return code.startsWith(DOCS_SYMBOL) && code.endsWith(DOCS_SYMBOL)
        ? code.slice(DOCS_SYMBOL.length, -DOCS_SYMBOL.length)
        : code;
}

/**
 * The wrapper doc {@link wrapMarkup} added, which is always the source's first node.
 * Usually it is the program's own documentation, but a text whose wrapper escapes
 * (`Hello ¶note¶ world`) closes it early and leaves the doc adjacent to code, where it
 * documents the statement that follows instead (#1374). Either way it is the first `Doc`
 * in reading order, and the caller still checks {@link isWholeMarkup} before rendering.
 */
function firstDoc(source: Source): Doc | undefined {
    const program = source.expression;
    return (
        program.docs.docs[0] ??
        program.expression.statements[0]
            ?.nodes()
            .find((node): node is Doc => node instanceof Doc)
    );
}

/** The `Markup` node the editor renders: the first doc's markup. */
export function getMarkup(source: Source): Markup | undefined {
    return firstDoc(source)?.markup;
}

/**
 * Whether the source's first doc covers the whole markup — false when the text
 * carries an unclosed *container* delimiter, which escapes the wrapper and leaves
 * the remainder parsed as something other than prose. Three can do it:
 *
 * - `¶` closes the wrapper, so what follows lexes as code (`Hello ¶note¶ world`).
 * - `` ` `` opens a formatted literal that swallows the rest (`a ` + backtick).
 * - `\` opens an example that runs past the wrapper's own closing `¶`.
 *
 * The text still round-trips — nothing is lost — but only part of it is inside a
 * `Markup` node, so rendering it as prose would silently show less than the
 * creator wrote. Callers use this to fall back to plain editing rather than
 * misrepresent the content. Real content hits the first case: 3 of 64 built
 * how-to parts use `¶…¶` as a callout.
 */
export function isWholeMarkup(source: Source): boolean {
    const markup = getMarkup(source);
    return (
        markup !== undefined &&
        markup.toWordplay(source.spaces) === sourceToMarkup(source)
    );
}

/**
 * The caret positions the markup occupies, excluding the `¶` wrapper. Text
 * positions count graphemes, matching `Source.tokenPositions`, so the bounds are
 * one grapheme in from each end — the wrapper is a single-grapheme token at each
 * end and is never rendered, so a caret that reached it would have nowhere to draw.
 */
export function markupBounds(source: Source): [number, number] {
    const length = source.getCode().getLength();
    // A source whose code is shorter than both delimiters can't be wrapped;
    // collapse to a single position rather than returning an inverted range.
    if (length < 2) return [0, 0];
    return [1, length - 1];
}

/** Clamp a text position into {@link markupBounds}. */
export function clampPosition(source: Source, position: number): number {
    const [low, high] = markupBounds(source);
    return Math.min(high, Math.max(low, position));
}

/**
 * Keep a caret inside the markup. A text position or range is clamped to
 * {@link markupBounds}; a node position is left alone, since a node selection can
 * only name a node the markup contains — the wrapper's `¶` tokens are never
 * rendered, so nothing can select them.
 */
export function clampToMarkup(caret: Caret): Caret {
    const position = caret.position;
    if (isPosition(position)) {
        const clamped = clampPosition(caret.source, position);
        // Carry the goal column: clamping is not a caret operation of its own, and
        // dropping it here would make a vertical move at the document's edge
        // forget the column every other vertical move remembers.
        return clamped === position
            ? caret
            : caret.withPosition(clamped, undefined, caret.visualColumn);
    }
    if (isRange(position)) {
        const start = clampPosition(caret.source, position[0]);
        const end = clampPosition(caret.source, position[1]);
        return start === position[0] && end === position[1]
            ? caret
            : caret.withPosition([start, end]);
    }
    return caret;
}

/** Whether a node is the `¶` wrapper rather than something the author wrote.
 *  The editor hides these, and no command may target one. */
export function isWrapperToken(source: Source, node: Node): boolean {
    const doc = firstDoc(source);
    return doc !== undefined && (node === doc.open || node === doc.close);
}

/**
 * Whether the editor can hold this text and give it back unchanged — the guard a
 * surface checks before offering rich editing, so it degrades to a plain field
 * rather than silently rewriting a creator's string.
 *
 * Color selectors are the one accepted difference: the tokenizer strips U+FE0F
 * from all source and the app re-applies it when rendering, so normalizing them
 * is what every other markup path already does. Measured over the 321,561 strings
 * the app ships, 320,233 are exact and 1,321 differ only this way. The remaining 7
 * are what this guard is for: 5 carry a bare `¶` (see {@link isWholeMarkup}) and 2
 * carry zero-width spaces, which the tokenizer drops as whitespace.
 */
export function canRepresent(text: string): boolean {
    const source = markupToSource(text);
    return (
        isWholeMarkup(source) &&
        sourceToMarkup(source) === withoutColorSelector(text)
    );
}

/**
 * Whether any formatting run, example, or link in the markup is missing its
 * closing delimiter. Such markup is legal — `parseWords` simply leaves `close`
 * undefined — but it cannot be typed back character by character, because the
 * completer pairs a delimiter as it is typed. The editor uses this to decide
 * whether a formatting command should close a run or leave it open.
 */
export function hasUnclosedDelimiter(source: Source): boolean {
    const markup = getMarkup(source);
    if (markup === undefined) return false;
    return markup
        .nodes()
        .some((n) =>
            n instanceof Words
                ? (n.open === undefined) !== (n.close === undefined)
                : n instanceof Example || n instanceof WebLink
                  ? n.close === undefined
                  : false,
        );
}
