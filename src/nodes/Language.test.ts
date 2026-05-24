import DuplicateLanguage from '@conflicts/DuplicateLanguage';
import MissingLanguage from '@conflicts/MissingLanguage';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import { describe, expect, test } from 'vitest';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';
import Language from '@nodes/Language';

test.each([
    ['a/en: 5', 'a/aaa: 5', Language, UnknownLanguage],
    ['a/en: 5', 'a/: 5', Language, MissingLanguage],
    // Each language token in a multilingual tag is validated individually.
    ['a/es_en: 5', 'a/es_aaa: 5', Language, UnknownLanguage],
    // Repeated language codes within the same tag trigger DuplicateLanguage.
    ['a/es_en: 5', 'a/es_es: 5', Language, DuplicateLanguage],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});

describe('parsing multilingual language tags', () => {
    function getLanguage(source: string): Language {
        const program = parseProgram(toTokens(source));
        const language = program.nodes().find((n) => n instanceof Language) as
            | Language
            | undefined;
        expect(language).toBeDefined();
        return language!;
    }

    test('single-language tag remains monolingual', () => {
        const lang = getLanguage('a/en: 5');
        expect(lang.getLanguageTexts()).toEqual(['en']);
        expect(lang.isMultilingual()).toBe(false);
    });

    test('underscore joins two languages', () => {
        const lang = getLanguage('a/es_en: 5');
        expect(lang.getLanguageTexts()).toEqual(['es', 'en']);
        expect(lang.isMultilingual()).toBe(true);
    });

    test('underscore-joined tag with region', () => {
        const lang = getLanguage('a/es_en-MX: 5');
        expect(lang.getLanguageTexts()).toEqual(['es', 'en']);
        expect(lang.getRegionText()).toBe('MX');
    });

    test('arbitrarily long multilingual tag (no cap)', () => {
        const lang = getLanguage('a/es_en_fr_de_pt: 5');
        expect(lang.getLanguageTexts()).toEqual([
            'es',
            'en',
            'fr',
            'de',
            'pt',
        ]);
        expect(lang.isMultilingual()).toBe(true);
    });

    test('isLocaleLanguage returns true for any matching language in the tag', () => {
        const lang = getLanguage('a/es_en: 5');
        expect(
            lang.isLocaleLanguage({ language: 'es', regions: [] }),
        ).toBe(true);
        expect(
            lang.isLocaleLanguage({ language: 'en', regions: [] }),
        ).toBe(true);
        expect(
            lang.isLocaleLanguage({ language: 'fr', regions: [] }),
        ).toBe(false);
    });

    test('getLocaleIDs exposes one Locale per language', () => {
        const lang = getLanguage('a/es_en-MX: 5');
        const ids = lang.getLocaleIDs();
        expect(ids).toHaveLength(2);
        expect(ids[0]).toEqual({ language: 'es', regions: ['MX'] });
        expect(ids[1]).toEqual({ language: 'en', regions: ['MX'] });
    });

    test('isEqualTo distinguishes language order', () => {
        const a = getLanguage('a/es_en: 5');
        const b = getLanguage('a/en_es: 5');
        expect(a.isEqualTo(b)).toBe(false);
    });

    test('backward-compatible: single-language tag still parses to one entry', () => {
        const lang = getLanguage('a/en-US: 5');
        expect(lang.getLanguageTexts()).toEqual(['en']);
        expect(lang.getRegionText()).toBe('US');
        expect(lang.isMultilingual()).toBe(false);
    });
});
