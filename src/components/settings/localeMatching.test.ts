import { Languages } from '@locale/LanguageCode';
import { Regions } from '@locale/Regions';
import { describe, expect, test } from 'vitest';
import {
    allLanguageOptions,
    allRegionOptions,
    bestMatch,
    matchLanguages,
    matchRegions,
} from './LocaleSearch.svelte';

const EN = ['en' as const];

describe('matchLanguages', () => {
    test('an empty query is the whole list, so clearing the box restores it', () => {
        expect(matchLanguages('', EN)).toEqual(allLanguageOptions());
        expect(matchLanguages('   ', EN)).toEqual(allLanguageOptions());
        expect(matchLanguages('', EN)).toHaveLength(
            Object.keys(Languages).length,
        );
    });

    test('matches the English name by prefix', () => {
        expect(matchLanguages('portug', EN)[0]?.value).toBe('pt');
    });

    test('matches the native name by prefix', () => {
        expect(matchLanguages('español', EN)[0]?.value).toBe('es');
        expect(matchLanguages('日本', EN)[0]?.value).toBe('ja');
    });

    test('an exact code wins over a name that starts the same way', () => {
        // "no" is Norwegian's code, and also the start of several English names.
        expect(matchLanguages('no', EN)[0]?.value).toBe('no');
    });

    test('is a prefix match, not a substring match', () => {
        // "ish" ends English, Spanish, Danish, Turkish… and must match none of them.
        expect(matchLanguages('ish', EN)).toEqual([]);
    });

    test('ranks a tie by speakers, so the most-read language comes first', () => {
        // Both English and a much smaller language start with "en"; English leads.
        expect(matchLanguages('engl', EN)[0]?.value).toBe('en');
        const hindiFirst = matchLanguages('hi', EN);
        expect(hindiFirst[0]?.value).toBe('hi');
    });

    test('a query matching nothing returns nothing', () => {
        expect(matchLanguages('zzzzqq', EN)).toEqual([]);
    });
});

describe('matchRegions', () => {
    test('an empty query is the whole list', () => {
        expect(matchRegions('', EN)).toEqual(allRegionOptions());
        expect(matchRegions('', EN)).toHaveLength(Object.keys(Regions).length);
    });

    test('matches a country name by prefix', () => {
        expect(matchRegions('braz', EN)[0]?.value).toBe('BR');
    });

    test('matches a region code, case-insensitively', () => {
        expect(matchRegions('mx', EN)[0]?.value).toBe('MX');
        expect(matchRegions('MX', EN)[0]?.value).toBe('MX');
    });

    test('is a prefix match, not a substring match', () => {
        expect(matchRegions('ublic', EN)).toEqual([]);
    });
});

describe('bestMatch', () => {
    test('an empty query selects nothing', () => {
        expect(bestMatch('', EN)).toEqual({});
    });

    test('a language query fills the language, leaving the region alone', () => {
        expect(bestMatch('portug', EN)).toEqual({ language: 'pt' });
    });

    test('a country query with no language match fills the region', () => {
        expect(bestMatch('braz', EN)).toEqual({ region: 'BR' });
    });

    test('language wins when a query could be read as either', () => {
        // The form is primarily about a missing language, so that axis takes
        // precedence rather than the two fighting over one box.
        const both = bestMatch('in', EN);
        expect(both.language).toBeDefined();
        expect(both.region).toBeUndefined();
    });

    test('a query matching neither selects nothing', () => {
        expect(bestMatch('zzzzqq', EN)).toEqual({});
    });
});
