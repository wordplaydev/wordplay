import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

/**
 * The checkpoint diff's inline marks sit inside the editor's DOM but are not
 * part of its model: it can't be edited, the caret can't land on it, and it belongs
 * to a different parse than everything around it.
 *
 * The editor finds its own elements by selector, so the ghost has to match none
 * of them. Each one below is read by real code, and a mark that matched it
 * would not fail loudly — it would put a foreign node into caret geometry,
 * pointer hit-testing or outline tracing and quietly shift the caret. A
 * one-millisecond file read closes the whole class; a browser test would catch
 * at most the one case it exercised.
 */
const Marks = 'src/components/editor/nodes/DiffOnlyNowView.svelte';

/**
 * The file with its comments taken out. The component's own documentation
 * names several of these selectors in order to explain why it avoids them, and
 * a check that can't tell an explanation from a use is a check nobody can
 * write a comment around.
 */
function code(): string {
    return readFileSync(Marks, 'utf8')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
}

/** Each selector, and what reads it. */
const Forbidden: [string, string][] = [
    [
        'token-view',
        'Editor.getTokenViews, PointerUtilities.getTokenPosition, outline, CaretView',
    ],
    ['node-view', 'PointerUtilities.getNodeAt and getTokenFromElement'],
    ['data-id', 'Editor.getNodeView, PointerUtilities.getSpacePosition'],
    ['node-', 'Editor.getNodeView, by element id'],
    ['space-text', 'PointerUtilities.geometricCaretIndexAt, outline'],
    ['data-uiid', 'the space and node scans, and the tour highlighter'],
    ['data-line', 'CaretView.computeSpaceDimensions'],
    ['data-space', 'CaretView.computeSpaceDimensions'],
    ['data-node-id', 'PointerUtilities.getBreakPosition'],
    ['data-synthetic', "TokenView's synthesized-token marker"],
];

test.each(Forbidden)(
    'the marks do not use %s, which is read by %s',
    (selector) => {
        expect(code()).not.toContain(selector);
    },
);

test('the marks let the pointer through to the code beneath them', () => {
    // Without this they swallow the pointerdown that places the caret, and
    // clicking near one does nothing.
    expect(readFileSync(Marks, 'utf8')).toContain('pointer-events: none');
});

test('the marks are hidden from screen readers', () => {
    // The editor's screen-reader channel is the mirrored textarea plus the
    // caret announcement; text left in the flow would be read as though it
    // were part of the source being viewed.
    expect(readFileSync(Marks, 'utf8')).toContain('aria-hidden="true"');
});
