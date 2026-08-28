import { expect, test, vi } from 'vitest';

// No canvas in node. Ten pixels per character at 1m keeps the arithmetic
// checkable, and reading the size back out of the CSS font string makes the
// stand-in scale the way a real face does.
vi.mock('@output/Output/getTextMetrics', () => ({
    default: (text: string, cssFont: string) => {
        const px = Number(/(\d+(?:\.\d+)?)px/.exec(cssFont)?.[1] ?? 64);
        return {
            width: text.length * 10 * (px / 64),
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
            fontBoundingBoxAscent: 10,
            fontBoundingBoxDescent: 3,
        };
    },
}));

const { default: measureBubble } = await import('@output/Bubble/bubbleLayout');
const { default: Bubble } = await import('@output/Bubble/Bubble');
const { default: TextValue } = await import('@values/TextValue');
const { default: TextLiteral } = await import('@nodes/TextLiteral');

/** A bubble carrying some text, with no evaluation behind it. */
function bubbleOf(text: string, wrap?: number, thought = false) {
    // A real creator node, so nothing here depends on a cast.
    const value = new TextValue(TextLiteral.make(text), text);
    return new Bubble(
        value,
        value,
        undefined,
        undefined,
        thought ? '💭' : '💬',
        undefined,
        undefined,
        undefined,
        wrap,
    );
}

const HorizontalChrome = 2 * 0.5 + 2 * 0.06;
const VerticalChrome = 2 * 0.3 + 2 * 0.06;

test('a short line is as wide as its words plus the padding and border', () => {
    // 'hi' is 20px = 0.3125m at 64px per metre.
    const box = measureBubble(bubbleOf('hi'), 'Noto Sans', 1, 'en-US');
    expect(box.width).toBeCloseTo(20 / 64 + HorizontalChrome, 5);
    expect(box.height).toBeCloseTo(1.25 + VerticalChrome, 5);
});

test('a bubble never reports wider than the boundary it wraps at', () => {
    // Far more text than 2m of wrap can hold.
    const box = measureBubble(
        bubbleOf('aa bb cc dd ee ff gg hh', 2),
        'Noto Sans',
        1,
        'en-US',
    );
    expect(box.width).toBeLessThanOrEqual(2 + 1e-9);
    // And it took more than one line to get there.
    expect(box.height).toBeGreaterThan(1.25 + VerticalChrome);
});

test('an unset wrap falls back to the CSS boundary, which scales with the size', () => {
    // 12em: 12m at size 1, 24m at size 2. A long line fills each without passing it.
    const long = 'aaaaaaaaaa '.repeat(40);
    const small = measureBubble(bubbleOf(long), 'Noto Sans', 1, 'en-US');
    const large = measureBubble(bubbleOf(long), 'Noto Sans', 2, 'en-US');
    expect(small.width).toBeLessThanOrEqual(12);
    expect(small.width).toBeGreaterThan(10);
    expect(large.width).toBeLessThanOrEqual(24);
    expect(large.width).toBeGreaterThan(20);
});

test('a set wrap is absolute, so it does not scale with the size', () => {
    // Twice the type in the same 5m: more lines, but never a wider box.
    const long = 'aaaaaaaaaa '.repeat(40);
    const small = measureBubble(bubbleOf(long, 5), 'Noto Sans', 1, 'en-US');
    const large = measureBubble(bubbleOf(long, 5), 'Noto Sans', 2, 'en-US');
    expect(small.width).toBeLessThanOrEqual(5);
    expect(large.width).toBeLessThanOrEqual(5);
    expect(large.height).toBeGreaterThan(small.height);
});

test('a thought sits further out than something said', () => {
    expect(
        measureBubble(bubbleOf('hi'), 'Noto Sans', 1, 'en-US').tail,
    ).toBeCloseTo(0.3, 5);
    expect(
        measureBubble(bubbleOf('hi', undefined, true), 'Noto Sans', 1, 'en-US')
            .tail,
    ).toBeCloseTo(0.8, 5);
});

test('everything scales with the bubble size', () => {
    const one = measureBubble(bubbleOf('hi'), 'Noto Sans', 1, 'en-US');
    const two = measureBubble(bubbleOf('hi'), 'Noto Sans', 2, 'en-US');
    expect(two.height).toBeCloseTo(one.height * 2, 5);
    expect(two.tail).toBeCloseTo(one.tail * 2, 5);
});
