import {
    isCodepointRenderable,
    loadRenderableRanges,
} from '#basis/faces/renderable.ts';
import { getLocaleWritingScript } from '#locale/LanguageCode.ts';
import { stringToLocale, type Locale } from '#locale/Locale.ts';
import { getLocaleLanguage } from '#locale/LocaleText.ts';
import { Scripts, type ScriptMetadata } from '#locale/Scripts.ts';
import { SupportedLocales } from '#locale/SupportedLocales.ts';
import { beforeAll, describe, expect, test } from 'vitest';
import {
    getLogoCyclePool,
    getLogoGlyphForLocale,
    getLogoLanguageCycle,
} from './logoGlyph';

// isCodepointRenderable answers true before the table loads; load it first so
// the renderability assertions below are real.
beforeAll(async () => await loadRenderableRanges());

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

function graphemes(text: string): string[] {
    return Array.from(segmenter.segment(text)).map((s) => s.segment);
}

describe('logo glyphs', () => {
    test('every supported locale’s dominant script has an exemplar glyph', () => {
        // A locale whose dominant script lacks a glyph silently falls back to
        // Latin 'a' in the logo; adding a locale should add its script's glyph.
        for (const locale of SupportedLocales) {
            const parsed = stringToLocale(locale);
            expect(parsed, `${locale} has no language`).toBeDefined();
            if (parsed === undefined) continue;
            const script = getLocaleWritingScript(parsed);
            const meta: ScriptMetadata = Scripts[script];
            expect(
                meta.glyph,
                `script ${script} (dominant for ${locale}) has no glyph in Scripts.ts`,
            ).toBeDefined();
        }
    });

    test('every script glyph is a single renderable grapheme', () => {
        for (const [script, metadata] of Object.entries(Scripts)) {
            const meta: ScriptMetadata = metadata;
            if (meta.glyph === undefined) continue;
            expect(
                graphemes(meta.glyph).length,
                `script ${script} glyph is not a single grapheme`,
            ).toBe(1);
            for (const codepoint of meta.glyph) {
                const value = codepoint.codePointAt(0);
                expect(value).toBeDefined();
                if (value !== undefined)
                    expect(
                        isCodepointRenderable(value),
                        `script ${script} glyph U+${value.toString(16)} is not renderable by any bundled font`,
                    ).toBe(true);
            }
        }
    });

    test('the cycle pool starts with the primary script’s glyph and has no duplicates', () => {
        const samples: Locale[] = [
            { language: 'en', regions: ['US'] },
            { language: 'ko', regions: ['KR'] },
            { language: 'ar', regions: ['SA'] },
        ];
        for (const locale of samples) {
            const pool = getLogoCyclePool(locale);
            expect(pool[0]).toBe(getLogoGlyphForLocale(locale));
            expect(new Set(pool).size).toBe(pool.length);
            // The pool always ends with something beyond letters.
            expect(pool.some((entry) => graphemes(entry).length === 1)).toBe(
                true,
            );
        }
    });

    test('a locale written in another script than its language gets that script’s glyph', () => {
        // Roman Urdu is Urdu in Latin script (#1457): its logo says 'a', not 'ع'.
        expect(
            getLogoGlyphForLocale({
                language: 'ur',
                regions: ['PK'],
                script: 'Latn',
            }),
        ).toBe('a');
        expect(getLogoGlyphForLocale({ language: 'ur', regions: ['PK'] })).toBe(
            'ع',
        );
    });

    test('the landing cycle pairs every supported locale with its script glyph, then adds the emoji', () => {
        const entries = getLogoLanguageCycle();
        // Every supported locale appears once, in order, language driving glyph.
        const locales = entries
            .filter((entry) => entry.locale !== undefined)
            .map((entry) => entry.locale);
        expect(locales).toEqual(
            SupportedLocales.filter(
                (locale) => getLocaleLanguage(locale) !== undefined,
            ),
        );
        for (const entry of entries) {
            if (entry.locale === undefined) continue;
            const locale = stringToLocale(entry.locale);
            expect(locale).toBeDefined();
            if (locale !== undefined)
                expect(entry.glyph).toBe(getLogoGlyphForLocale(locale));
        }
        // The glyph-only entries come last, so the label can hold the
        // previous language while the bubble says an emoji.
        const firstGlyphOnly = entries.findIndex(
            (entry) => entry.locale === undefined,
        );
        expect(firstGlyphOnly).toBeGreaterThan(0);
        for (const entry of entries.slice(firstGlyphOnly))
            expect(entry.locale).toBeUndefined();
    });

    test('every cycle pool entry is renderable', () => {
        for (const entry of getLogoCyclePool({
            language: 'en',
            regions: ['US'],
        })) {
            for (const character of entry) {
                const value = character.codePointAt(0);
                if (value === undefined) continue;
                // Skip variation selectors and ZWJ, which are not glyphs.
                if (value === 0xfe0f || value === 0x200d) continue;
                expect(
                    isCodepointRenderable(value),
                    `cycle entry ${entry} U+${value.toString(16)} is not renderable`,
                ).toBe(true);
            }
        }
    });
});
