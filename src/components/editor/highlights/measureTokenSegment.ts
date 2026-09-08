import type { Axes, LogicalPoint } from '@components/editor/util/axes';

// Grapheme segmentation for locating an offset inside a token view's rendered
// text. Boundaries are locale-independent, so one shared instance suffices.
const Segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Locate a grapheme offset across an ordered list of text-node contents,
 * returning which node holds it and the UTF-16 offset within that node
 * (clamped to the end of the last node). Undefined when there is no text.
 *
 * A token view is not one flat string: TokenView wraps every emoji run in its
 * own span (the editor's monospace token font can't render color emoji), so a
 * token's text is spread across several text nodes. Segmenting each node
 * independently is correct because every boundary the renderer introduces is
 * itself a grapheme boundary — segmentEmoji segments by grapheme and coalesces
 * only same-kind runs.
 *
 * Deliberately not routed through UnicodeString: its constructor NFC-normalizes,
 * and a code-unit length taken from the normalized string can mis-index the raw
 * text actually in the DOM.
 */
export function locateGraphemeOffset(
    texts: string[],
    offset: number,
): { index: number; codeUnit: number } | undefined {
    if (texts.length === 0) return undefined;
    if (offset <= 0) return { index: 0, codeUnit: 0 };

    let remaining = offset;
    for (const [index, text] of texts.entries()) {
        let seen = 0;
        for (const { index: at } of Segmenter.segment(text)) {
            if (seen === remaining) return { index, codeUnit: at };
            seen++;
        }
        // The offset is this node's end, and there is no node after it to
        // express the same position as an offset of zero.
        if (seen === remaining && index === texts.length - 1)
            return { index, codeUnit: text.length };
        remaining -= seen;
    }

    // Past the end of everything: clamp to the end of the last node.
    const last = texts.length - 1;
    return { index: last, codeUnit: texts[last].length };
}

/**
 * The width and height of the token view's text from its start up to the given
 * grapheme offset, or undefined when the view has no text to measure.
 */

/**
 * Whether a token view renders text other than its source text — a keyword shown
 * as a word, or a name shown in another language (`TokenView`'s `data-synthetic`).
 *
 * Everything in this module takes a *source* grapheme offset and indexes
 * *rendered* text with it, which is exact only while the two are the same
 * string. They are not for a substituted token, and `locateGraphemeOffset`
 * fails by clamping rather than erroring, so a caret lands on the wrong glyph
 * and a selection is misclipped with nothing to notice. There is no honest
 * mapping between `Phrase` and `Frase`, so a substituted token has no interior
 * positions at all: every offset resolves to one of its two edges. Clicking one
 * therefore puts the caret at its edge, which reverts it to the real name — the
 * `isInCaret` guard in `Token.localized` — and makes editing coherent.
 */
function isSynthetic(tokenView: Element) {
    return tokenView.hasAttribute('data-synthetic');
}

/** An offset into a synthetic token, collapsed to the near or far edge. Past the
 *  end clamps in `locateGraphemeOffset`, so Infinity is "the end of the text". */
function atomicOffset(tokenView: Element, offset: number) {
    return isSynthetic(tokenView) ? (offset <= 0 ? 0 : Infinity) : offset;
}

export function measureTokenSegment(
    tokenView: Element,
    tokenOffset: number,
    blocks: boolean,
) {
    tokenOffset = atomicOffset(tokenView, tokenOffset);
    const nodes = getTextNodes(tokenView);
    if (nodes.length === 0) {
        console.error('Unable to find text node to measure segment.');
        return undefined;
    }

    const found = locateGraphemeOffset(
        nodes.map((node) => node.textContent ?? ''),
        tokenOffset,
    );
    if (found === undefined) return undefined;

    // The range spans from the first text node to an offset inside whichever
    // node holds the target grapheme, so it can't be a single-node range.
    const range = document.createRange();
    range.setStart(nodes[0], 0);
    range.setEnd(nodes[found.index], found.codeUnit);

    const rect = range.getBoundingClientRect();
    return [rect.width, rect.height];
}

/**
 * The client rect of the collapsed caret position `tokenOffset` graphemes into a
 * token view, or undefined when there is nothing to measure.
 *
 * {@link measureTokenSegment} answers "how wide is the text before the caret",
 * which locates the caret only while the token occupies one line: both the
 * segment's box and the token view's own box are unions of the token's line
 * fragments, so the moment a token soft-wraps, the width is the widest line and
 * the origin is the leftmost edge — neither says anything about where the caret
 * sits. A collapsed range is the direct question and has no such ambiguity.
 *
 * This matters for code today only for a long wrapped text literal, but markup
 * makes it structural: a whole paragraph of prose is a single `Sym.Words` token.
 */
export function locateCaretRect(
    tokenView: Element,
    tokenOffset: number,
): DOMRect | undefined {
    tokenOffset = atomicOffset(tokenView, tokenOffset);
    const nodes = getTextNodes(tokenView);
    if (nodes.length === 0) return undefined;

    const found = locateGraphemeOffset(
        nodes.map((node) => node.textContent ?? ''),
        tokenOffset,
    );
    if (found === undefined) return undefined;

    const range = document.createRange();
    range.setStart(nodes[found.index], found.codeUnit);
    range.collapse(true);

    // At a soft-wrap boundary a collapsed range reports two rects — the end of
    // one line and the start of the next — because the position is expressible
    // either way. Take the last, which is the start of the next line: a caret
    // position is an index, and the character at that index is what follows the
    // caret, so the caret belongs on the line that character is on. Away from a
    // boundary there is exactly one rect and the choice is moot. Fall back to the
    // bounding box for an engine that reports none.
    const rects = range.getClientRects();
    const rect =
        rects.length > 0
            ? rects[rects.length - 1]
            : range.getBoundingClientRect();
    // A detached or display:none view measures as nothing; say so rather than
    // reporting the origin, which would put the caret in the corner of the page.
    return rect.width === 0 && rect.height === 0 && rect.x === 0 && rect.y === 0
        ? undefined
        : rect;
}

/**
 * One client rect per **visual line** the graphemes `[from, to)` occupy.
 *
 * A token's own box, and any range's bounding box, is the *union* of the lines
 * the token covers, so anything drawn from it is as tall as the whole token. In
 * code that is invisible — tokens are short and `NodeView` emits a `<wbr>`
 * between them — but a paragraph of prose is a single `Sym.Words` token, so a
 * one-word selection outlined the entire paragraph. `getClientRects` answers the
 * question the union box cannot: it returns one rect per line fragment, and
 * exactly one for a token that doesn't wrap, so nothing changes for code.
 */
export function segmentLineRects(
    tokenView: Element,
    from: number,
    to: number,
): DOMRect[] {
    // A substituted token is outlined whole or not at all: it has no interior
    // boundary a source offset could name.
    if (isSynthetic(tokenView) && from !== to) {
        from = 0;
        to = Infinity;
    }
    const nodes = getTextNodes(tokenView);
    if (nodes.length === 0) return [];
    const texts = nodes.map((node) => node.textContent ?? '');

    const start = locateGraphemeOffset(texts, Math.min(from, to));
    const end = locateGraphemeOffset(texts, Math.max(from, to));
    if (start === undefined || end === undefined) return [];

    const range = document.createRange();
    range.setStart(nodes[start.index], start.codeUnit);
    range.setEnd(nodes[end.index], end.codeUnit);

    // A zero-area rect is a detached or `display: none` view reporting the page
    // origin; drawing there would put the highlight in the corner of the window.
    return Array.from(range.getClientRects()).filter(
        (rect) => rect.width !== 0 || rect.height !== 0,
    );
}

/**
 * The grapheme offset into a token view nearest a point, or undefined when there
 * is nothing to measure.
 *
 * The pointer code used to interpolate — `textLength × (extent / totalExtent)` —
 * which is exact for monospace on one line and wrong everywhere else. Prose is
 * set in a proportional face, so glyph widths differ; and a wrap breaks the
 * linear map even in monospace, because each line fragment holds a different
 * number of characters per pixel. Asking the browser where each offset actually
 * is has none of those assumptions, and a binary search over collapsed ranges
 * costs O(log n) measurements rather than one arithmetic guess.
 *
 * The search is over the *block* axis first and the inline axis second, so a
 * click on the third line of a wrapped token resolves to that line rather than
 * to the same fraction along the first.
 */
export function graphemeOffsetAt(
    tokenView: Element,
    length: number,
    at: LogicalPoint,
    axes: Axes,
): number | undefined {
    if (length <= 0) return 0;

    // A substituted token has no interior positions, so a click resolves to
    // whichever of its edges is nearer along the text.
    if (isSynthetic(tokenView)) {
        const box = axes.rect(tokenView.getBoundingClientRect());
        return at.inline < (box.inlineStart + box.inlineEnd) / 2 ? 0 : length;
    }

    // Walk the view's text nodes and segment them ONCE, rather than per probe.
    // `locateCaretRect` does both on every call, and the search makes a dozen of
    // them; measured over vertical caret motion, hoisting this is most of the
    // difference between the search and the arithmetic it replaced.
    const nodes = getTextNodes(tokenView);
    if (nodes.length === 0) return undefined;
    const table = graphemeTable(nodes.map((node) => node.textContent ?? ''));

    const range = document.createRange();
    // Where an offset sits, in logical coordinates. Undefined offsets sort last
    // so an unmeasurable position can never win the comparison below.
    const locate = (offset: number) => {
        const found = table[Math.min(Math.max(0, offset), table.length - 1)];
        if (found === undefined) return undefined;
        range.setStart(nodes[found.index], found.codeUnit);
        range.collapse(true);
        const rects = range.getClientRects();
        const rect =
            rects.length > 0
                ? rects[rects.length - 1]
                : range.getBoundingClientRect();
        return rect.width === 0 &&
            rect.height === 0 &&
            rect.x === 0 &&
            rect.y === 0
            ? undefined
            : axes.rect(rect);
    };

    // Compare by line first: an offset on the clicked line always beats one on
    // another line, however close that other one is along the text.
    const distance = (offset: number): [number, number] | undefined => {
        const box = locate(offset);
        if (box === undefined) return undefined;
        const block =
            at.block < box.blockStart
                ? box.blockStart - at.block
                : at.block > box.blockEnd
                  ? at.block - box.blockEnd
                  : 0;
        return [block, Math.abs(at.inline - box.inlineStart)];
    };

    const closer = (a: [number, number], b: [number, number]) =>
        a[0] !== b[0] ? a[0] < b[0] : a[1] < b[1];

    let best: number | undefined = undefined;
    let bestDistance: [number, number] | undefined = undefined;
    const consider = (offset: number) => {
        const d = distance(offset);
        if (d === undefined) return;
        if (bestDistance === undefined || closer(d, bestDistance)) {
            best = offset;
            bestDistance = d;
        }
    };

    // Narrow to a neighbourhood, then check every offset in it. The search keeps
    // the best seen rather than trusting the final bracket, because the compare
    // is two-dimensional and so not strictly monotone across a wrap boundary.
    let low = 0;
    let high = length;
    consider(low);
    consider(high);
    while (high - low > 2) {
        const middle = Math.floor((low + high) / 2);
        consider(middle);
        const box = locate(middle);
        if (box === undefined) break;
        const after =
            at.block > box.blockEnd ||
            (at.block >= box.blockStart && at.inline > box.inlineStart);
        if (after) low = middle;
        else high = middle;
    }
    for (let offset = low; offset <= high; offset++) consider(offset);

    return best;
}

/** Every grapheme boundary in a token view's text, as (node, UTF-16 offset)
 *  pairs, plus the end. Built once so a search over offsets does not re-segment
 *  the text on every probe — the same mapping {@link locateGraphemeOffset}
 *  computes for one offset at a time. */
function graphemeTable(texts: string[]): { index: number; codeUnit: number }[] {
    const table: { index: number; codeUnit: number }[] = [];
    for (const [index, text] of texts.entries())
        for (const { index: at } of Segmenter.segment(text))
            table.push({ index, codeUnit: at });
    const last = texts.length - 1;
    if (last >= 0) table.push({ index: last, codeUnit: texts[last].length });
    return table;
}

/** The token view's own text nodes in document order, skipping the label spans
 * (an elided marker, a placeholder's name) that aren't part of the token text.
 * The token view itself also carries a `placeholder` class for state, so the
 * exclusion has to match a descendant rather than the view. */
function getTextNodes(tokenView: Element): Text[] {
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(tokenView, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const label = node.parentElement?.closest('.elided, .placeholder');
            return label && label !== tokenView
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT;
        },
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode())
        if (node instanceof Text) nodes.push(node);
    return nodes;
}
