import Markup from '@nodes/Markup';
import Paragraph, { type Segment } from '@nodes/Paragraph';
import Words from '@nodes/Words';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import UnicodeString from '@unicode/UnicodeString';
import { getRewriteEntrySteps } from '@output/animation/getRewriteTransition';
import { getRandomEntrySteps } from '@output/animation/getRandomTransition';

/**
 * Truncating a Markup mirrors the plain-text typewriter (see getTextTransition):
 * we rebuild the node tree containing only the first `graphemes` plain
 * characters, keeping the formatting (bold/italic/links/spacing) of whatever
 * survives. Whole tokens are kept by identity so their entries in the original
 * Spaces map still apply; only the single boundary token is sliced, and its
 * space is carried over with Spaces.withReplacement. The result renders through
 * the same MarkupHTMLView as the resting markup, so the morph looks identical.
 */

type SegmentsResult = {
    /** The truncated segments. */
    segments: Segment[];
    /** How many plain graphemes were consumed. */
    used: number;
    /** The boundary token that was sliced, and its sliced replacement, if any. */
    replaced: [Token, Token] | undefined;
};

function plainLength(text: string): number {
    return new UnicodeString(text).getLength();
}

/** Recursively truncate a list of segments to at most `budget` plain graphemes. */
function truncateSegments(segments: Segment[], budget: number): SegmentsResult {
    const result: Segment[] = [];
    let used = 0;
    let replaced: [Token, Token] | undefined = undefined;

    for (const segment of segments) {
        const remaining = budget - used;
        if (remaining <= 0) break;

        // A formatting wrapper (e.g. *bold*, _italic_): keep its open/close
        // delimiters by identity and recurse into its inner segments.
        if (segment instanceof Words) {
            const inner = truncateSegments(segment.segments, remaining);
            // Skip an empty span entirely rather than render nothing.
            if (inner.segments.length > 0) {
                result.push(
                    new Words(segment.open, inner.segments, segment.close),
                );
                used += inner.used;
            }
            if (inner.replaced) replaced = inner.replaced;
            if (inner.used >= remaining) break;
        }
        // A plain-text token: keep whole if it fits, otherwise slice it.
        else if (segment instanceof Token && segment.isSymbol(Sym.Words)) {
            const length = segment.getTextLength();
            if (length <= remaining) {
                result.push(segment);
                used += length;
            } else {
                const sliced = segment.withText(
                    segment.text.substring(0, remaining).toString(),
                );
                result.push(sliced);
                used += remaining;
                replaced = [segment, sliced];
                break;
            }
        }
        // Any other segment (link, mention, concept, value/node ref) is atomic:
        // include it whole if it fits, otherwise stop before it.
        else {
            const length = plainLength(segment.toText());
            if (length <= remaining) {
                result.push(segment);
                used += length;
            } else break;
        }
    }

    return { segments: result, used, replaced };
}

/**
 * Return a new Markup containing only the first `graphemes` plain characters of
 * `markup`, with formatting preserved. Operates on the single-paragraph asLine()
 * form, which is how PhraseView renders phrase markup.
 */
export function truncateMarkup(markup: Markup, graphemes: number): Markup {
    const line = markup.asLine();
    const paragraph = line.paragraphs[0];
    if (paragraph === undefined) return line;

    const { segments, replaced } = truncateSegments(
        paragraph.segments,
        Math.max(0, graphemes),
    );

    // Keep the original spaces for surviving tokens (kept by identity); carry the
    // sliced boundary token's space over to its replacement.
    const spaces =
        replaced && line.spaces
            ? line.spaces.withReplacement(replaced[0], replaced[1])
            : line.spaces;

    return new Markup([new Paragraph(segments)], spaces);
}

/**
 * Build the sequence of Markup steps that morph `start` into `end`, mirroring
 * getTextTransition: backspace `start` down to the common plain-text prefix,
 * then type `end` forward. Each step is a truncated Markup, so formatting is
 * preserved throughout. The first step is the full `start` and the last is the
 * full `end`.
 */
/**
 * The positions the rewrite/random effects operate over for a markup: one
 * entry per plain grapheme of each text token, and one entry per atomic
 * segment (link, mention, concept, value/node reference), which replaces as a
 * single unit like an emoji grapheme. Walks the same way replaceMarkupText
 * does, so positions align.
 */
export function markupGraphemes(markup: Markup): string[] {
    const paragraph = markup.asLine().paragraphs[0];
    return paragraph === undefined ? [] : segmentGraphemes(paragraph.segments);
}

function segmentGraphemes(segments: Segment[]): string[] {
    const result: string[] = [];
    for (const segment of segments) {
        if (segment instanceof Words)
            result.push(...segmentGraphemes(segment.segments));
        else if (segment instanceof Token && segment.isSymbol(Sym.Words))
            result.push(...segment.text.getGraphemes());
        else result.push(segment.toText());
    }
    return result;
}

type ReplaceSegmentsResult = {
    /** The rebuilt segments. */
    segments: Segment[];
    /** How many positions were consumed. */
    used: number;
    /** Every token whose text changed, and its replacement, for Spaces carryover. */
    replaced: [Token, Token][];
};

/** Recursively rebuild segments with each position's text swapped for its entry. */
function replaceSegments(
    segments: Segment[],
    entries: string[],
    start: number,
): ReplaceSegmentsResult {
    const result: Segment[] = [];
    let used = 0;
    const replaced: [Token, Token][] = [];

    for (const segment of segments) {
        const position = start + used;
        // A formatting wrapper: keep its delimiters and recurse, skipping an
        // empty span entirely rather than render nothing.
        if (segment instanceof Words) {
            const inner = replaceSegments(segment.segments, entries, position);
            if (inner.segments.length > 0)
                result.push(
                    new Words(segment.open, inner.segments, segment.close),
                );
            replaced.push(...inner.replaced);
            used += inner.used;
        }
        // A plain-text token: its graphemes are replaced 1:1 by its positions'
        // entries; keep it by identity when nothing changed so its entry in
        // the original Spaces map still applies.
        else if (segment instanceof Token && segment.isSymbol(Sym.Words)) {
            const length = segment.getTextLength();
            const text = entries.slice(position, position + length).join('');
            used += length;
            if (text.length > 0) {
                if (text === segment.getText()) result.push(segment);
                else {
                    const swapped = segment.withText(text);
                    result.push(swapped);
                    replaced.push([segment, swapped]);
                }
            }
        }
        // An atomic segment occupies one position and is kept whole while its
        // entry is non-empty; its content doesn't cycle.
        else {
            if (entries[position] !== undefined && entries[position] !== '')
                result.push(segment);
            used += 1;
        }
    }

    return { segments: result, used, replaced };
}

/**
 * Rebuild `markup` with its positions' text replaced 1:1 by `entries`, so
 * every entry wears the formatting the target markup gives that position. An
 * empty entry omits its position; entries beyond the markup's positions (a
 * shrinking text's surplus) are appended to the last position so remnants
 * render in the text's trailing format.
 */
export function replaceMarkupText(markup: Markup, entries: string[]): Markup {
    const line = markup.asLine();
    const paragraph = line.paragraphs[0];
    if (paragraph === undefined) return line;

    const total = markupGraphemes(line).length;
    let fitted = entries;
    if (entries.length > total && total > 0) {
        fitted = entries.slice(0, total);
        fitted[total - 1] += entries.slice(total).join('');
    }

    const { segments, replaced } = replaceSegments(
        paragraph.segments,
        fitted,
        0,
    );

    // Carry each changed token's space over to its replacement so inter-word
    // spacing survives the swap.
    let spaces = line.spaces;
    for (const [original, replacement] of replaced)
        spaces = spaces
            ? spaces.withReplacement(original, replacement)
            : spaces;

    return new Markup([new Paragraph(segments)], spaces);
}

/**
 * The rewrite effect over formatted text: type `end`'s positions over
 * `start`'s in random order, with every step's characters wearing `end`'s
 * formatting at their position. The final step is exactly `end`.
 */
export function getMarkupRewriteTransition(
    start: Markup,
    end: Markup,
    random: () => number = Math.random,
): Markup[] {
    const endLine = end.asLine();
    const steps = getRewriteEntrySteps(
        markupGraphemes(start),
        markupGraphemes(end),
        random,
    );
    return steps.map((entries, index) =>
        index === steps.length - 1 ? endLine : replaceMarkupText(endLine, entries),
    );
}

/**
 * The random (slot-machine) effect over formatted text: every position cycles
 * `pool` characters wearing `end`'s formatting at that position, locking in at
 * random times. The final step is exactly `end`.
 */
export function getMarkupRandomTransition(
    start: Markup,
    end: Markup,
    pool: readonly string[],
    stepCount: number,
    random: () => number = Math.random,
): Markup[] {
    const endLine = end.asLine();
    const steps = getRandomEntrySteps(
        markupGraphemes(start),
        markupGraphemes(end),
        pool,
        stepCount,
        random,
    );
    return steps.map((entries, index) =>
        index === steps.length - 1 ? endLine : replaceMarkupText(endLine, entries),
    );
}

export function getMarkupTransition(start: Markup, end: Markup): Markup[] {
    const startGraphemes = new UnicodeString(start.toText()).getGraphemes();
    const endGraphemes = new UnicodeString(end.toText()).getGraphemes();

    // Common prefix length in graphemes.
    let common = 0;
    while (
        common < startGraphemes.length &&
        common < endGraphemes.length &&
        startGraphemes[common] === endGraphemes[common]
    )
        common++;

    const steps: Markup[] = [];
    // When the texts share no prefix, stop backspacing at one grapheme and
    // start typing at one grapheme, so the text never blanks out
    // mid-transition; truncating to nothing remains correct when either
    // endpoint is itself empty.
    const floor =
        common === 0 && startGraphemes.length > 0 && endGraphemes.length > 0
            ? 1
            : common;
    // Backspace from the full start down to the common prefix.
    for (let i = startGraphemes.length; i >= floor; i--)
        steps.push(truncateMarkup(start, i));
    // Type the end forward from the common prefix to the full end.
    for (let i = floor; i <= endGraphemes.length; i++)
        steps.push(truncateMarkup(end, i));

    return steps;
}
