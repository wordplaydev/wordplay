import DuplicateLanguage from '@conflicts/DuplicateLanguage';
import MissingLanguage from '@conflicts/MissingLanguage';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import { describe, expect, test } from 'vitest';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';
import Language from '@nodes/Language';

/** Parse a Language node from a flat tag, e.g. `langFromTag('es_en-MX_US')`. */
function langFromTag(tag: string): Language {
    const program = parseProgram(toTokens(`a/${tag}: 5`));
    const language = program.nodes().find((n) => n instanceof Language);
    expect(language).toBeDefined();
    return language as Language;
}

test.each([
    ['a/en: 5', 'a/aaa: 5', Language, UnknownLanguage],
    ['a/en: 5', 'a/: 5', Language, MissingLanguage],
    // Each language token in a multilingual tag is validated individually.
    ['a/es_en: 5', 'a/es_aaa: 5', Language, UnknownLanguage],
    // Repeated language codes within the same tag trigger DuplicateLanguage.
    ['a/es_en: 5', 'a/es_es: 5', Language, DuplicateLanguage],
    // Repeated region codes within the same tag also trigger DuplicateLanguage.
    ['a/en-US_CA: 5', 'a/en-US_US: 5', Language, DuplicateLanguage],
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

    test('underscore joins multiple regions', () => {
        const lang = getLanguage('a/en-US_CA: 5');
        expect(lang.getRegionTexts()).toEqual(['US', 'CA']);
        expect(lang.getTagString()).toBe('en-US_CA');
    });

    test('multilingual tag with multiple regions round-trips', () => {
        const lang = getLanguage('a/es_en-MX_US: 5');
        expect(lang.getLanguageTexts()).toEqual(['es', 'en']);
        expect(lang.getRegionTexts()).toEqual(['MX', 'US']);
        expect(lang.getTagString()).toBe('es_en-MX_US');
    });

    test('getLocaleIDs shares all regions across languages', () => {
        const lang = getLanguage('a/es_en-MX_US: 5');
        const ids = lang.getLocaleIDs();
        expect(ids).toHaveLength(2);
        expect(ids[0]).toEqual({ language: 'es', regions: ['MX', 'US'] });
        expect(ids[1]).toEqual({ language: 'en', regions: ['MX', 'US'] });
    });

    test('isLocaleRegion matches when any region overlaps', () => {
        const lang = getLanguage('a/en-US_CA: 5');
        expect(lang.isLocaleRegion({ language: 'en', regions: ['CA'] })).toBe(
            true,
        );
        expect(lang.isLocaleRegion({ language: 'en', regions: ['MX'] })).toBe(
            false,
        );
    });

    test('isEqualTo distinguishes region sets', () => {
        const a = getLanguage('a/en-US_CA: 5');
        const b = getLanguage('a/en-US: 5');
        expect(a.isEqualTo(b)).toBe(false);
    });
});

describe('Language.union', () => {
    test.each([
        ['en', 'es', 'en_es'],
        ['es', 'en', 'es_en'],
        ['en-US', 'fr-CA', 'en_fr-US_CA'],
        // Deduplicate shared languages and regions.
        ['en-US', 'en-CA', 'en-US_CA'],
        ['es_en', 'en_fr', 'es_en_fr'],
    ])('union(%s, %s) = %s', (a, b, expected) => {
        expect(
            Language.union(langFromTag(a), langFromTag(b))?.getTagString(),
        ).toBe(expected);
    });

    test('an undefined side inherits the other', () => {
        expect(Language.union(undefined, langFromTag('en'))?.getTagString()).toBe(
            'en',
        );
        expect(Language.union(langFromTag('en'), undefined)?.getTagString()).toBe(
            'en',
        );
        expect(Language.union(undefined, undefined)).toBeUndefined();
    });
});

describe('Language.getPossibleExtensions', () => {
    test('suggests adding another language and another region', () => {
        const tags = langFromTag('en')
            .getPossibleExtensions()
            .map((l) => l.getTagString());
        // Adds a supported language as an extra.
        expect(tags).toContain('en_es');
        // Adds a supported region.
        expect(tags.some((t) => t?.startsWith('en-') ?? false)).toBe(true);
    });

    test('skips codes already present and keeps existing region', () => {
        const tags = langFromTag('en-MX')
            .getPossibleExtensions()
            .map((l) => l.getTagString());
        // Adding a language preserves the existing region.
        expect(tags).toContain('en_es-MX');
        // Never re-suggests the tag itself.
        expect(tags).not.toContain('en-MX');
    });
});

describe('Language.getBCP47', () => {
    test.each([
        ['en', 'en'],
        ['en-US', 'en-US'],
        // Multilingual / multi-region collapse to the primary language + region.
        ['es_en', 'es'],
        ['es_en-MX_US', 'es-MX'],
    ])('getBCP47 of %s is %s', (tag, expected) => {
        expect(langFromTag(tag).getBCP47()).toBe(expected);
    });
});
