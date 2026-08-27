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
export function measureTokenSegment(
    tokenView: Element,
    tokenOffset: number,
    blocks: boolean,
) {
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
