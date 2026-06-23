import { describe, expect, test } from 'vitest';
import { parseColor, serializeColor } from '@output/ColorJS';

describe('parseColor', () => {
    test.each([
        ['#ff0000', 'hex'],
        ['rgb(255 0 0)', 'rgb'],
        ['red', 'keyword'],
        ['hsl(0 100% 50%)', 'hsl'],
        ['oklch(0.7 0.1 200)', 'oklch'],
        ['lab(50% 40 30)', 'lab'],
        ['oklab(0.5 0.1 0.1)', 'oklab'],
        ['hwb(120 0% 0%)', 'hwb'],
        ['lch(50% 80 260)', 'lch'],
    ])('parses %s with format %s', (text, format) => {
        const result = parseColor(text);
        expect(result, text).toBeDefined();
        expect(result?.format, text).toBe(format);
        // Lightness is normalized to 0-1, chroma/hue are non-negative numbers.
        expect(result?.lightness).toBeGreaterThanOrEqual(0);
        expect(result?.lightness).toBeLessThanOrEqual(1);
        expect(result?.chroma).toBeGreaterThanOrEqual(0);
        expect(result?.hue).toBeGreaterThanOrEqual(0);
    });

    test('red and #ff0000 resolve to the same LCH', () => {
        const a = parseColor('#ff0000');
        const b = parseColor('red');
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        expect(a?.lightness).toBeCloseTo(b?.lightness ?? -1, 5);
        expect(a?.chroma).toBeCloseTo(b?.chroma ?? -1, 5);
        expect(a?.hue).toBeCloseTo(b?.hue ?? -1, 5);
    });

    test.each(['nope', '', '   ', '#zzz', 'rgb(oops)'])(
        'returns undefined for %s',
        (text) => {
            expect(parseColor(text)).toBeUndefined();
        },
    );
});

describe('serializeColor', () => {
    test('round-trips an in-gamut color back into each format', () => {
        // A muted blue that's comfortably inside sRGB.
        const l = 0.5;
        const c = 30;
        const h = 260;
        for (const format of [
            'hex',
            'rgb',
            'hsl',
            'hwb',
            'lab',
            'lch',
            'oklab',
            'oklch',
        ]) {
            const out = serializeColor(l, c, h, format);
            expect(out.format, format).toBe(format);
            // Re-parsing the serialized text should land near the original LCH.
            const reparsed = parseColor(out.text);
            expect(reparsed, `${format}: ${out.text}`).toBeDefined();
            expect(reparsed?.lightness, format).toBeCloseTo(l, 1);
        }
    });

    test('keyword falls back to hex', () => {
        const out = serializeColor(0.5, 30, 260, 'keyword');
        expect(out.format).toBe('hex');
        expect(out.text.startsWith('#')).toBe(true);
    });

    test('out-of-gamut LCH serializes to valid hex without throwing', () => {
        // Very high chroma — outside sRGB; must gamut-map (needs OKLCH registered).
        const out = serializeColor(0.5, 130, 30, 'hex');
        expect(out.format).toBe('hex');
        expect(out.text).toMatch(/^#[0-9a-f]{6}$/i);
    });
});
