import Caret, { isPosition, isRange } from '@edit/caret/Caret';
import { clampPosition, markupBounds } from '@edit/markup/markupSource';
import Example from '@nodes/Example';
import type Node from '@nodes/Node';
import type Source from '@nodes/Source';
import Words, { type Format } from '@nodes/Words';
import {
    ATTENTION_SYMBOL,
    BOLD_SYMBOL,
    BULLET_SYMBOL,
    CODE_SYMBOL,
    DEFECT_SYMBOL,
    DOCS_SYMBOL,
    EXTRA_SYMBOL,
    HIGHLIGHT_SYMBOL,
    ITALIC_SYMBOL,
    LIGHT_SYMBOL,
    LINK_SYMBOL,
    TAG_CLOSE_SYMBOL,
    TAG_OPEN_SYMBOL,
    UNDERSCORE_SYMBOL,
} from '@parser/Symbols';
import { getWordInfo } from '@runtime/pattern/segment';
import UnicodeString from '@unicode/UnicodeString';

/**
 * The formatting commands, as pure functions over a {@link Source} and a caret
 * position. They splice delimiter text rather than rebuilding nodes, because
 * `Caret.wrap` only wraps `Expression`s (blocks, lists, sets, binary evaluates)
 * and has nothing to say about `Words`.
 *
 * Every one is a **toggle**, which is what a word processor's bold button does and
 * what the old FormattedEditor didn't: pressing it inside a bold run removes the
 * bold rather than nesting a second one.
 */

/** A source and the caret that should follow it, the shape `Caret` operations return. */
export type MarkupRevision = [Source, Caret];

export const FormatSymbols: Record<Format, string> = {
    italic: ITALIC_SYMBOL,
    underline: UNDERSCORE_SYMBOL,
    light: LIGHT_SYMBOL,
    bold: BOLD_SYMBOL,
    extra: EXTRA_SYMBOL,
};

/** The caret's text span: a collapsed point, a range, or a selected node's extent. */
export function spanOf(caret: Caret): [number, number] | undefined {
    const position = caret.position;
    if (isPosition(position)) return [position, position];
    if (isRange(position))
        return position[0] <= position[1]
            ? [position[0], position[1]]
            : [position[1], position[0]];
    const span = caret.getSelectionSpan();
    return span === undefined
        ? undefined
        : span[0] <= span[1]
          ? span
          : [span[1], span[0]];
}

/**
 * The innermost `Words` carrying this format that encloses the whole span, if any.
 * This is what makes the commands toggles: an enclosing run means the command
 * should remove it rather than add another.
 */
export function enclosingFormat(
    source: Source,
    span: [number, number],
    format: Format,
): Words | undefined {
    const token = tokenAt(source, span[0]);
    if (token === undefined) return undefined;
    for (const ancestor of [token, ...source.root.getAncestors(token)]) {
        if (!(ancestor instanceof Words)) continue;
        if (ancestor.getFormat() !== format) continue;
        // Only a run that contains the whole span; a partial overlap is a request
        // to format the part that isn't formatted, not to unformat what is.
        const start = source.getNodeFirstPosition(ancestor);
        const end = source.getNodeLastPosition(ancestor);
        if (start === undefined || end === undefined) continue;
        if (start <= span[0] && end >= span[1]) return ancestor;
    }
    return undefined;
}

/**
 * The token at a position, falling back to the one whose leading space contains
 * it. `getTokenAt(position, false)` reports nothing for a caret sitting in
 * whitespace, which inside `\1 + 1\` is most of the positions a creator will
 * have their caret in.
 */
function tokenAt(source: Source, position: number) {
    return (
        source.getTokenAt(position, false) ?? source.getTokenAt(position, true)
    );
}

/** Replace the graphemes in `[start, end)` with `text`, returning the new source. */
function splice(
    source: Source,
    start: number,
    end: number,
    text: string,
): Source {
    const code = source.getCode();
    return source.withCode(
        code.substring(0, start).toString() +
            text +
            code.substring(end).toString(),
    );
}

/** The grapheme span a node occupies, or undefined when it isn't placed. */
function spanOfNode(source: Source, node: Node): [number, number] | undefined {
    const start = source.getNodeFirstPosition(node);
    const end = source.getNodeLastPosition(node);
    return start === undefined || end === undefined ? undefined : [start, end];
}

function caretAt(source: Source, position: number | [number, number]): Caret {
    return new Caret(
        source,
        typeof position === 'number'
            ? clampPosition(source, position)
            : [
                  clampPosition(source, position[0]),
                  clampPosition(source, position[1]),
              ],
        undefined,
        undefined,
    );
}

/**
 * Add or remove a formatting run over the caret's span.
 *
 * Adding with a collapsed caret inserts the delimiter pair and lands between them,
 * so typing continues inside the new run. Adding over a range wraps it and keeps
 * the same text selected, so a second command can be applied to the same words.
 * Removing strips the enclosing run's delimiters wherever they are, which is why
 * it works with the caret merely inside the run rather than spanning it.
 */
export function toggleFormat(
    caret: Caret,
    format: Format,
): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    if (span === undefined) return undefined;

    const [low, high] = markupBounds(source);
    const start = Math.min(Math.max(span[0], low), high);
    const end = Math.min(Math.max(span[1], low), high);

    const existing = enclosingFormat(source, [start, end], format);
    const symbol = FormatSymbols[format];

    if (existing !== undefined) {
        // Remove: take out the close first so the open's position still holds.
        const open = existing.open;
        const close = existing.close;
        if (open === undefined) return undefined;
        const openSpan = spanOfNode(source, open);
        if (openSpan === undefined) return undefined;
        const closeSpan =
            close === undefined ? undefined : spanOfNode(source, close);

        let revised = source;
        if (closeSpan !== undefined)
            revised = splice(revised, closeSpan[0], closeSpan[1], '');
        revised = splice(revised, openSpan[0], openSpan[1], '');

        // Shift the caret by whatever was removed before it.
        const openWidth = openSpan[1] - openSpan[0];
        const shift = (at: number) => (at >= openSpan[1] ? at - openWidth : at);
        return [
            revised,
            caretAt(
                revised,
                start === end ? shift(start) : [shift(start), shift(end)],
            ),
        ];
    }

    // Add: splice the delimiter at both ends, high end first so `start` still holds.
    let revised = splice(source, end, end, symbol);
    revised = splice(revised, start, start, symbol);
    const width = new UnicodeString(symbol).getLength();
    return [
        revised,
        caretAt(
            revised,
            start === end ? start + width : [start + width, end + width],
        ),
    ];
}

/** Wrap the caret's span in `\…\`, making it a code example. Not a toggle: an
 *  example's content is code, and unwrapping one would silently turn a program
 *  into prose. */
export function insertExample(caret: Caret): MarkupRevision | undefined {
    return wrapSpan(caret, CODE_SYMBOL, CODE_SYMBOL);
}

/**
 * A URL a new link starts with, selected so the creator types over it.
 *
 * It cannot be empty. A link's URL is a `Sym.URL` token, and that pattern needs
 * `://` and at least one character after it — so `<label@>` does not parse as a
 * link at all: it is plain prose, `<`, `@` and `>` show as literal text, and the
 * next thing typed makes `@h` lex as a **concept reference**, after which further
 * letters are refused. That is the whole of "the link button inserts some
 * invisible markup". `example.com` is IANA's reserved example domain, so it is
 * meaningful in every language and is nobody's real site.
 */
const PlaceholderURL = 'https://example.com';

/** Wrap the caret's span as a link's description, with the placeholder URL
 *  selected so typing replaces it — the part the creator still has to supply. */
export function insertWebLink(caret: Caret): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    if (span === undefined) return undefined;
    const [start, end] = clampSpan(source, span);
    const tail = LINK_SYMBOL + PlaceholderURL + TAG_CLOSE_SYMBOL;
    let revised = splice(source, end, end, tail);
    revised = splice(revised, start, start, TAG_OPEN_SYMBOL);

    // Measured rather than assumed, so a multi-grapheme delimiter could never put
    // the caret mid-character.
    const open = new UnicodeString(TAG_OPEN_SYMBOL).getLength();
    const at = new UnicodeString(LINK_SYMBOL).getLength();
    const url = new UnicodeString(PlaceholderURL).getLength();
    const urlStart = end + open + at;
    return [
        revised,
        // A described link selects its URL, since that is what is left to do. An
        // undescribed one has no label yet, so the caret goes there instead.
        start === end
            ? caretAt(revised, start + open)
            : caretAt(revised, [urlStart, urlStart + url]),
    ];
}

/** Insert a concept reference (`@Phrase`) at the caret, replacing any selection. */
export function insertConceptLink(
    caret: Caret,
    name: string,
): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    if (span === undefined) return undefined;
    const [start, end] = clampSpan(source, span);
    const text = LINK_SYMBOL + name;
    const revised = splice(source, start, end, text);
    return [
        revised,
        caretAt(revised, start + new UnicodeString(text).getLength()),
    ];
}

/**
 * Add or remove a bullet on the line the caret is on. Bullets are not tokens —
 * `•` is ordinary `Sym.Words` text that `Paragraph.isBulleted()` recovers
 * structurally — so this is a line operation, not a node one.
 */
export function toggleBullet(caret: Caret): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    if (span === undefined) return undefined;
    const code = source.getCode();
    const [start] = clampSpan(source, span);

    // Find the start of the caret's line, stopping at the markup's own start so
    // the bullet can never land before the `¶` wrapper.
    const [low] = markupBounds(source);
    let lineStart = start;
    while (lineStart > low && code.at(lineStart - 1) !== '\n') lineStart--;

    const prefix = BULLET_SYMBOL + ' ';
    const width = new UnicodeString(prefix).getLength();
    const alreadyBulleted =
        code.substring(lineStart, lineStart + width).toString() === prefix;

    const revised = alreadyBulleted
        ? splice(source, lineStart, lineStart + width, '')
        : splice(source, lineStart, lineStart, prefix);
    return [
        revised,
        caretAt(revised, alreadyBulleted ? start - width : start + width),
    ];
}

/**
 * Enter on a bulleted line continues the list, and Enter on an empty bullet ends it.
 *
 * The old editor had no such rule, so a creator who made one bullet had to invoke
 * the command again for every item after it — which is exactly the syntax this
 * feature exists to stop people learning. Returns undefined off a bulleted line so
 * the ordinary line insert still handles the keystroke.
 */
export function continueBullet(caret: Caret): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    // Only a collapsed caret: pressing Enter over a selection replaces it, which
    // is the ordinary insert's job rather than a list rule.
    if (span === undefined || span[0] !== span[1]) return undefined;
    const at = span[0];
    const code = source.getCode();

    const [low, high] = markupBounds(source);
    if (at < low || at > high) return undefined;
    let lineStart = at;
    while (lineStart > low && code.at(lineStart - 1) !== '\n') lineStart--;

    const prefix = BULLET_SYMBOL + ' ';
    const width = new UnicodeString(prefix).getLength();
    if (code.substring(lineStart, lineStart + width).toString() !== prefix)
        return undefined;

    // An empty bullet means "I'm done listing": drop the bullet rather than
    // making another one, the way every list editor does.
    let lineEnd = at;
    while (lineEnd < high && code.at(lineEnd) !== '\n') lineEnd++;
    if (
        code
            .substring(lineStart + width, lineEnd)
            .toString()
            .trim() === ''
    ) {
        // Ending the list has to end the *paragraph* too. Items are separated by
        // a single newline, so simply dropping the bullet would leave the caret on
        // a soft break inside the last item, and whatever came next — in testing, a
        // `\…\` example — would be part of that bullet rather than after the list.
        const paragraph = lineStart > low ? '\n' : '';
        const revised = splice(source, lineStart, lineEnd, paragraph);
        return [
            revised,
            caretAt(revised, lineStart + (paragraph === '' ? 0 : 1)),
        ];
    }

    const insertion = '\n' + prefix;
    const revised = splice(source, at, at, insertion);
    return [
        revised,
        caretAt(revised, at + new UnicodeString(insertion).getLength()),
    ];
}

/** The graphemes of a source, cached so `getWordInfo`'s own WeakMap — which is
 *  keyed on the array's identity — actually hits across keystrokes. A `Source` is
 *  immutable, so an entry can never go stale. */
const sourceGraphemes = new WeakMap<Source, string[]>();
function graphemesOf(source: Source): string[] {
    let graphemes = sourceGraphemes.get(source);
    if (graphemes === undefined) {
        graphemes = source.getCode().getGraphemes();
        sourceGraphemes.set(source, graphemes);
    }
    return graphemes;
}

/**
 * Move or extend the caret by one word.
 *
 * There is no word motion anywhere else in the app — the code editor's arrows
 * step *token* boundaries, which is a different thing that happens to coincide
 * in code. Prose needs the real one, and it must be segmented rather than
 * scanned for spaces: Japanese and Chinese mark no word boundary with
 * whitespace at all, and Thai marks none either.
 *
 * `getWordInfo` ([segment.ts](src/runtime/pattern/segment.ts)) already wraps
 * `Intl.Segmenter` and — the reason to reuse it rather than call the segmenter
 * here — returns its boundaries in **grapheme indices**, the same unit
 * `Caret.position` counts in. It also already degrades a malformed language tag
 * to the host default.
 *
 * Forward lands on the END of the next word and backward on the START of the
 * previous one, skipping the punctuation and space between, which is what every
 * platform's word motion does. Stepping every segmenter boundary instead would
 * stop three times in `Wordplay. ` — once for the word, once for the period,
 * once for the space.
 */
export function moveByWord(
    caret: Caret,
    direction: -1 | 1,
    extend: boolean,
    language: string,
): MarkupRevision | undefined {
    const source = caret.source;
    const [low, high] = markupBounds(source);
    const span = spanOf(caret);
    if (span === undefined) return undefined;

    const position = caret.position;
    const from = Array.isArray(position)
        ? position[1]
        : direction < 0
          ? span[0]
          : span[1];

    const { wordStarts } = getWordInfo(graphemesOf(source), language);
    let target: number | undefined = undefined;
    if (direction > 0) {
        for (const end of wordStarts.values())
            if (
                end > from &&
                end <= high &&
                (target === undefined || end < target)
            )
                target = end;
    } else {
        for (const start of wordStarts.keys())
            if (
                start < from &&
                start >= low &&
                (target === undefined || start > target)
            )
                target = start;
    }
    // No word that way: go to the edge, so the key is never silently inert.
    const moved = target ?? (direction > 0 ? high : low);

    if (extend) {
        const anchor = Array.isArray(position) ? position[0] : from;
        return [
            source,
            new Caret(
                source,
                moved === anchor ? anchor : [anchor, moved],
                undefined,
                undefined,
            ),
        ];
    }
    return [source, new Caret(source, moved, undefined, undefined)];
}

/**
 * The word around a position, as a span, or undefined when there is no word
 * there. What a double-click selects.
 */
export function wordAt(
    source: Source,
    position: number,
    language: string,
): [number, number] | undefined {
    const { wordStarts } = getWordInfo(graphemesOf(source), language);
    for (const [start, end] of wordStarts)
        // Inclusive of the end so a click just after the last letter — where a
        // caret most often sits — still selects the word it is touching.
        if (start <= position && position <= end) return [start, end];
    return undefined;
}

/** The paragraph around a position, as a span. What a triple-click selects. */
export function paragraphAt(
    source: Source,
    position: number,
): [number, number] {
    const code = source.getCode();
    const [low, high] = markupBounds(source);
    let start = Math.min(high, Math.max(low, position));
    let end = start;
    while (start > low && code.at(start - 1) !== '\n') start--;
    while (end < high && code.at(end) !== '\n') end++;
    return [start, end];
}

/** The example the caret is inside, if any. */
export function enclosingExample(caret: Caret): Example | undefined {
    const span = spanOf(caret);
    if (span === undefined) return undefined;
    const source = caret.source;
    const exampleOf = (position: number) => {
        const token = tokenAt(source, position);
        return token === undefined
            ? undefined
            : [token, ...source.root.getAncestors(token)].find(
                  (n): n is Example => n instanceof Example,
              );
    };
    // The token *ending* at the caret counts too, the ordinary adjacency rule.
    // `getTokenAt` matches on `position < index + length`, so a caret one past
    // the closing `\` resolved to the prose after it and reported no example —
    // and that is exactly where the ⭐ and 🪲 it annotates are rendered, so the
    // commands went inactive at the one position they most obviously apply.
    // (Asymmetrically, too: with an annotation already there, that token's parent
    // *is* the example, so removing one worked where adding one did not.)
    return exampleOf(span[0]) ?? exampleOf(Math.max(0, span[0] - 1));
}

/**
 * Toggle an example's `⭐` (highlight) or `🪲` (expected defect) suffix.
 *
 * The old editor scanned for the enclosing `\…\` by counting delimiters in the
 * string; here the annotation is a field on the `Example` node, so the command is
 * exact and knows when it doesn't apply.
 */
function toggleExampleAnnotation(
    caret: Caret,
    which: 'highlight' | 'defect',
): MarkupRevision | undefined {
    const example = enclosingExample(caret);
    if (example === undefined) return undefined;
    const source = caret.source;
    const existing = example[which];
    const symbol = which === 'highlight' ? HIGHLIGHT_SYMBOL : DEFECT_SYMBOL;

    // The caret stays where it is through both directions: the annotation is
    // metadata about the example, not a place to type, and leaving the caret in
    // the code means the command can be repeated without re-aiming.
    const keep = spanOf(caret);
    if (keep === undefined) return undefined;

    if (existing !== undefined) {
        const at = spanOfNode(source, existing);
        if (at === undefined) return undefined;
        const revised = splice(source, at[0], at[1], '');
        return [revised, caretAt(revised, keep[0])];
    }

    // Append after whatever suffix the example already carries, so `⭐` and `🪲`
    // can both be present and the order stays stable.
    const anchor = example.defect ?? example.highlight ?? example.close;
    if (anchor === undefined) return undefined;
    const at = spanOfNode(source, anchor);
    if (at === undefined) return undefined;
    const revised = splice(source, at[1], at[1], symbol);
    return [revised, caretAt(revised, keep[0])];
}

export function toggleHighlight(caret: Caret): MarkupRevision | undefined {
    return toggleExampleAnnotation(caret, 'highlight');
}

export function toggleDefect(caret: Caret): MarkupRevision | undefined {
    return toggleExampleAnnotation(caret, 'defect');
}

/** Wrap the caret's span in `¶…¶`, an explanation inside a code example. */
export function insertDocs(caret: Caret): MarkupRevision | undefined {
    return wrapSpan(caret, DOCS_SYMBOL, DOCS_SYMBOL);
}

/**
 * Insert the attention marker (`👀`) at the caret, which highlights the line of
 * code it sits on. Unlike `⭐`/`🪲` it marks a place rather than the example, so
 * it is an insertion rather than a toggle.
 */
export function insertAttention(caret: Caret): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    if (span === undefined) return undefined;
    const [start, end] = clampSpan(source, span);
    const revised = splice(source, start, end, ATTENTION_SYMBOL);
    return [
        revised,
        caretAt(
            revised,
            start + new UnicodeString(ATTENTION_SYMBOL).getLength(),
        ),
    ];
}

/** Clamp a span into the markup's own bounds. */
function clampSpan(source: Source, span: [number, number]): [number, number] {
    const [low, high] = markupBounds(source);
    return [
        Math.min(Math.max(span[0], low), high),
        Math.min(Math.max(span[1], low), high),
    ];
}

/** Wrap the caret's span in a delimiter pair, landing inside when collapsed. */
function wrapSpan(
    caret: Caret,
    open: string,
    close: string,
): MarkupRevision | undefined {
    const source = caret.source;
    const span = spanOf(caret);
    if (span === undefined) return undefined;
    const [start, end] = clampSpan(source, span);
    let revised = splice(source, end, end, close);
    revised = splice(revised, start, start, open);
    const width = new UnicodeString(open).getLength();
    return [
        revised,
        caretAt(
            revised,
            start === end ? start + width : [start + width, end + width],
        ),
    ];
}

/**
 * Move or extend the caret by one grapheme.
 *
 * Prose gets its own motion rather than borrowing the code editor's
 * `moveInlineText`, which selects the *node* when it steps onto a boundary — a
 * useful affordance for picking out a subexpression, and a bewildering one in a
 * paragraph, where a single ArrowLeft from the end selected the whole sentence
 * and the next Shift+ArrowLeft then extended by node rather than by character.
 * The `¶` wrapper makes it worse: the end of the text is always a token boundary,
 * so it happened on the very first keystroke of any backwards selection.
 *
 * Standard text-field semantics: a plain arrow collapses a selection to the edge
 * it moved toward, and a shifted arrow moves the focus end and keeps the anchor.
 */
export function moveByCharacter(
    caret: Caret,
    direction: -1 | 1,
    extend: boolean,
): MarkupRevision | undefined {
    const source = caret.source;
    const position = caret.position;
    const [low, high] = markupBounds(source);
    const clamp = (at: number) => Math.min(high, Math.max(low, at));

    // A node position is expressed as the span it covers, so motion out of it is
    // ordinary character motion rather than a second kind of movement.
    const span = spanOf(caret);
    if (span === undefined) return undefined;

    if (extend) {
        // Keep the anchor; move the focus. A collapsed caret becomes a range.
        const [anchor, focus] = Array.isArray(position)
            ? position
            : [span[0], span[1]];
        const moved = clamp(focus + direction);
        return [
            source,
            new Caret(
                source,
                moved === anchor ? anchor : [anchor, moved],
                undefined,
                undefined,
            ),
        ];
    }

    // Not extending: a selection collapses to the edge moved toward; a caret steps.
    const collapsed =
        span[0] === span[1]
            ? clamp(span[0] + direction)
            : direction < 0
              ? Math.min(span[0], span[1])
              : Math.max(span[0], span[1]);
    return [source, new Caret(source, collapsed, undefined, undefined)];
}
