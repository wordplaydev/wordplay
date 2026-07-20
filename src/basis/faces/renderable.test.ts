import { beforeAll, describe, expect, test } from 'vitest';
import { isCodepointRenderable, loadRenderableRanges } from './renderable';
import { RenderableRanges } from './renderable.generated';

/**
 * isCodepointRenderable is backed by the generated cmap-union set
 * (renderable.generated.ts). These check the predicate's behavior and that the
 * generated intervals are well-formed; the full "matches every chain font's
 * cmap" check runs in `npm run fonts -- --deep`.
 */

// The ranges load lazily now (see renderable.ts); load them before asserting.
beforeAll(async () => await loadRenderableRanges());

describe('isCodepointRenderable', () => {
    test('covered codepoints render', () => {
        expect(isCodepointRenderable(0x0041)).toBe(true); // A (Latin)
        expect(isCodepointRenderable(0x0639)).toBe(true); // ع (Arabic)
        expect(isCodepointRenderable(0x4e2d)).toBe(true); // 中 (Han)
        expect(isCodepointRenderable(0xac00)).toBe(true); // 가 (Hangul syllable)
        expect(isCodepointRenderable(0x1f600)).toBe(true); // 😀 (emoji)
    });

    test('codepoints no bundled font has a glyph for do not render', () => {
        expect(isCodepointRenderable(0xfbc3)).toBe(false); // unassigned Arabic presentation form
        expect(isCodepointRenderable(0xfa0d)).toBe(false); // CJK compatibility ideograph
        expect(isCodepointRenderable(0x1100)).toBe(false); // Hangul Jamo (subset-dropped)
        expect(isCodepointRenderable(0x10ec5)).toBe(false); // Arabic Extended-C (no Noto font)
        expect(isCodepointRenderable(0x10d40)).toBe(false); // Garay (no released Noto)
    });
});

describe('RenderableRanges is well-formed', () => {
    test('intervals are sorted, non-empty, and non-overlapping', () => {
        let prevHigh = -2;
        for (const [lo, hi] of RenderableRanges) {
            expect(lo).toBeLessThanOrEqual(hi);
            // Sorted and separated by a real gap (merged during generation).
            if (prevHigh >= 0) expect(lo).toBeGreaterThan(prevHigh + 1);
            prevHigh = hi;
        }
        expect(RenderableRanges.length).toBeGreaterThan(0);
    });
});
