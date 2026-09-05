import DuplicateLanguage from '@conflicts/DuplicateLanguage';
import MissingLanguage from '@conflicts/MissingLanguage';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import UnknownRegion from '@conflicts/UnknownRegion';
import { describe, expect, test } from 'vitest';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Project from '@db/projects/Project';
import Language from '@nodes/Language';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';

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
    // A language named rather than coded is not unknown (#1220)...
    ['a/Español: 5', 'a/Klingon: 5', Language, UnknownLanguage],
    // ...and naming the same language twice is still naming it twice.
    ['a/es_en: 5', 'a/es_Spanish: 5', Language, DuplicateLanguage],
    ['a/en-US_CA: 5', 'a/en-US_UnitedStates: 5', Language, DuplicateLanguage],
    // Regions went unvalidated until they could be named; now a region that
    // names nothing is a conflict rather than silently meaning nothing.
    ['a/es-México: 5', 'a/es-Merica: 5', Language, UnknownRegion],
    // Kosovo's XK is user-assigned rather than ISO 3166, and three languages
    // name it as a region they're spoken in, so it has to resolve (#1335).
    ['a/sq-XK: 5', 'a/sq-Kosova: 5', Language, UnknownRegion],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});

describe('tags written as names', () => {
    test.each([
        ['Español', ['es'], []],
        ['español', ['es'], []],
        ['Spanish', ['es'], []],
        ['日本語', ['ja'], []],
        ['es-México', ['es'], ['MX']],
        ['Español-México', ['es'], ['MX']],
        ['Español_English-México_USA', ['es', 'en'], ['MX', 'US']],
        // Codes are case-insensitive, as BCP-47 treats them.
        ['EN-us', ['en'], ['US']],
    ])('/%s names %s in %s', (tag, languages, regions) => {
        const language = langFromTag(tag);
        expect(language.getLanguageCodes()).toEqual(languages);
        expect(language.getRegionCodes()).toEqual(regions);
    });

    test('the spelling the author chose is what stays in the source', () => {
        const language = langFromTag('Español-México');
        expect(language.getLanguageTexts()).toEqual(['Español']);
        expect(language.getRegionTexts()).toEqual(['México']);
        expect(language.toWordplay()).toBe('/Español-México');
    });

    test('a tag serializes and speaks as codes however it is spelled', () => {
        expect(langFromTag('Español-México').getTagString()).toBe('es-MX');
        expect(langFromTag('Español-México').getBCP47()).toBe('es-MX');
        expect(langFromTag('es_Spanish').getTagString()).toBe('es');
    });

    test('an unrecognized tag keeps its text rather than losing the tag', () => {
        // TextValue asks `getTagString() !== undefined` to know a value carries
        // a tag at all, so filtering unknown codes out would silently untag it.
        expect(langFromTag('aaa').getTagString()).toBe('aaa');
        expect(langFromTag('aaa').getBCP47()).toBe('aaa');
        expect(langFromTag('aaa').getLanguageCodes()).toEqual([]);
    });

    test('two tags are equal when they mean the same thing', () => {
        expect(langFromTag('es').isEqualTo(langFromTag('Español'))).toBe(true);
        expect(
            langFromTag('es-MX').isEqualTo(langFromTag('Español-México')),
        ).toBe(true);
        expect(langFromTag('es').isEqualTo(langFromTag('en'))).toBe(false);
        expect(langFromTag('aaa').isEqualTo(langFromTag('bbb'))).toBe(false);
    });

    test('a translation tagged by name is selected for its locale', () => {
        // The point of the feature: `'hola'/Español` has to be found for a
        // Spanish reader exactly as `'hola'/es` would be.
        const literal = parseProgram(toTokens("'hello'/en'hola'/Español"))
            .nodes()
            .find((n) => n instanceof TextLiteral);
        if (literal === undefined) throw new Error('No text literal parsed');
        expect(
            literal.getLocaleText([{ language: 'es', regions: [] }]).getText(),
        ).toBe('hola');
        expect(
            literal.getLocaleText([{ language: 'en', regions: [] }]).getText(),
        ).toBe('hello');
    });

    test('a named tag matches its locale', () => {
        expect(
            langFromTag('Español-México').isLocale({
                language: 'es',
                regions: ['MX'],
            }),
        ).toBe(true);
    });

    test('extending a named tag does not re-add the language it names', () => {
        const extensions = langFromTag('Español')
            .getPossibleExtensions()
            .map((l) => l.getTagString());
        expect(extensions.some((tag) => tag === 'es_es')).toBe(false);
    });

    test('a description names the code and the language, whichever was written', () => {
        const source = new Source('test', "'hi'");
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const context = project.getContext(source);
        const inputs = (tag: string) =>
            langFromTag(tag).getDescriptionInputs(DefaultLocales, context);
        expect(inputs('es-MX')).toEqual({
            language: 'es (español)',
            region: 'MX (México)',
        });
        expect(inputs('Español-México')).toEqual({
            language: 'Español (es)',
            region: 'México (MX)',
        });
        expect(inputs('aaa')).toEqual({
            language: 'aaa',
            region: undefined,
        });
    });
});

describe('parsing multilingual language tags', () => {
    function getLanguage(source: string): Language {
        const program = parseProgram(toTokens(source));
        const language = program.nodes().find((n) => n instanceof Language) as
            Language | undefined;
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
        expect(lang.getLanguageTexts()).toEqual(['es', 'en', 'fr', 'de', 'pt']);
        expect(lang.isMultilingual()).toBe(true);
    });

    test('isLocaleLanguage returns true for any matching language in the tag', () => {
        const lang = getLanguage('a/es_en: 5');
        expect(lang.isLocaleLanguage({ language: 'es', regions: [] })).toBe(
            true,
        );
        expect(lang.isLocaleLanguage({ language: 'en', regions: [] })).toBe(
            true,
        );
        expect(lang.isLocaleLanguage({ language: 'fr', regions: [] })).toBe(
            false,
        );
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
        expect(
            Language.union(undefined, langFromTag('en'))?.getTagString(),
        ).toBe('en');
        expect(
            Language.union(langFromTag('en'), undefined)?.getTagString(),
        ).toBe('en');
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
