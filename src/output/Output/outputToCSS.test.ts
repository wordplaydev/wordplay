import { describe, expect, test } from 'vitest';
import { FallbackFontFamilies } from '@basis/faces/FallbackFonts';
import { CSSFallbackFaces } from '@output/Output/Stage';
import { getFaceCSS } from '@output/Output/outputToCSS';

describe('CSSFallbackFaces', () => {
    test('ends with a valid generic family', () => {
        // Regression guard: this used to end with the invalid 'sans serif',
        // which browsers silently treat as an unknown family name.
        expect(CSSFallbackFaces.endsWith(', sans-serif')).toBe(true);
    });

    test('includes the lazy script fallback faces', () => {
        expect(CSSFallbackFaces).toContain(FallbackFontFamilies);
    });

    test('starts with the emoji and default faces', () => {
        expect(
            CSSFallbackFaces.startsWith('"Noto Color Emoji", "Noto Sans", '),
        ).toBe(true);
    });
});

describe('getFaceCSS', () => {
    test('puts the chosen face before the fallback chain', () => {
        expect(getFaceCSS('Phudu')).toBe(`"Phudu", ${CSSFallbackFaces}`);
    });

    test('is null without a face', () => {
        expect(getFaceCSS(undefined)).toBeNull();
    });
});
