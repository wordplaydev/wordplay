import { expect, test, vi } from 'vitest';

// These run in node, which has no canvas. Ten pixels per character makes the
// wrapping arithmetic checkable by hand. Precedent: contacts.test.ts.
vi.mock('@output/Output/getTextMetrics', () => ({
    default: (text: string) => ({
        width: text.length * 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 10,
        fontBoundingBoxDescent: 3,
    }),
}));

const { default: measureFormats } =
    await import('@output/Output/measureFormats');

function measure(text: string, maxWidth: number | undefined, exact = false) {
    return measureFormats([{ text, italic: false, weight: undefined }], {
        face: 'Noto Sans',
        size: 1,
        maxWidth,
        layout: 'horizontal-tb',
        locale: 'en-US',
        exact,
    });
}

test('unwrapped text is measured whole, on one line', () => {
    const m = measure('aa bb cc', undefined);
    expect(m.width).toBe(80);
    expect(m.longestLine).toBe(80);
    expect(m.lines).toBe(1);
});

test('the phrase path keeps breaking the way it always has', () => {
    // Segments are 'aa ', 'bb ', 'cc' at 30/30/20. The historical rule breaks on
    // `>=` and counts the trailing space, so 30+30 and then 30+20 both break.
    const m = measure('aa bb cc', 50);
    expect(m.lines).toBe(3);
});

test('the bubble path breaks the way CSS does', () => {
    // Same text and boundary. 'aa ' then 'bb' is 50 of ink, which fits, so the
    // line holds; only 'cc' starts a second line.
    const m = measure('aa bb cc', 50, true);
    expect(m.lines).toBe(2);
});

test('the bubble path does not count the space it hangs at a break', () => {
    // The first line's ink is 'aa bb' = 50, not 60 with the trailing space. A
    // shrink-to-fit box measures the ink.
    const m = measure('aa bb cc', 50, true);
    expect(m.longestLine).toBe(50);
});

test('the widest line is what a shrink-to-fit box reports', () => {
    // 'aaaa ' (50) then 'b' (10): the longest line is the first.
    const m = measure('aaaa b', 60, true);
    expect(m.lines).toBe(1);
    expect(m.longestLine).toBe(60);
});

test('a run with no text at all measures nothing', () => {
    const m = measureFormats([], {
        face: 'Noto Sans',
        size: 1,
        maxWidth: undefined,
        layout: 'horizontal-tb',
        locale: 'en-US',
    });
    expect(m.width).toBe(0);
    expect(m.lines).toBe(1);
    expect(m.longestLine).toBe(0);
});
