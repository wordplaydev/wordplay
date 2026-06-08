import Markup from '@nodes/Markup';
import Paragraph, { type Segment } from '@nodes/Paragraph';
import Words from '@nodes/Words';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import UnicodeString from '@unicode/UnicodeString';

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
    // Backspace from the full start down to the common prefix.
    for (let i = startGraphemes.length; i >= common; i--)
        steps.push(truncateMarkup(start, i));
    // Type the end forward from the common prefix to the full end.
    for (let i = common; i <= endGraphemes.length; i++)
        steps.push(truncateMarkup(end, i));

    return steps;
}
