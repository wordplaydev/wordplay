import { describe, expect, test } from 'vitest';
import { appFontFamilies, codeFontFamilies } from './fontChains';

describe('appFontFamilies', () => {
    test('orders override, locale fonts, emoji, fallbacks, generic', () => {
        expect(appFontFamilies('Phudu', ['Noto Sans'])).toBe(
            '"Phudu", "Noto Sans", "Noto Color Emoji", "Noto Emoji", var(--wordplay-fallback-fonts), sans-serif',
        );
    });

    test('omits the override when none is chosen', () => {
        expect(appFontFamilies(null, ['Noto Sans'])).toBe(
            '"Noto Sans", "Noto Color Emoji", "Noto Emoji", var(--wordplay-fallback-fonts), sans-serif',
        );
    });

    test('deduplicates repeated faces', () => {
        expect(
            appFontFamilies('Noto Sans', ['Noto Sans', 'Noto Sans Korean']),
        ).toBe(
            '"Noto Sans", "Noto Sans Korean", "Noto Color Emoji", "Noto Emoji", var(--wordplay-fallback-fonts), sans-serif',
        );
    });

    test('inserts Noto Sans as the base face when a locale font omits it', () => {
        // Noto Sans must precede the fallback var in every chain so the fallback
        // CSS can strip shared Latin/punctuation from the script faces' ranges.
        expect(appFontFamilies(null, ['Noto Sans Korean'])).toBe(
            '"Noto Sans Korean", "Noto Sans", "Noto Color Emoji", "Noto Emoji", var(--wordplay-fallback-fonts), sans-serif',
        );
    });
});

describe('codeFontFamilies', () => {
    test('orders locale fonts, mono, emoji, sans, fallbacks, generic', () => {
        expect(codeFontFamilies(['Noto Sans Mono'])).toBe(
            '"Noto Sans Mono", "Noto Color Emoji", "Noto Emoji", "Noto Sans", var(--wordplay-fallback-fonts), monospace',
        );
    });

    test('puts a locale code font before the defaults', () => {
        expect(codeFontFamilies(['Noto Sans Korean'])).toBe(
            '"Noto Sans Korean", "Noto Sans Mono", "Noto Color Emoji", "Noto Emoji", "Noto Sans", var(--wordplay-fallback-fonts), monospace',
        );
    });
});
