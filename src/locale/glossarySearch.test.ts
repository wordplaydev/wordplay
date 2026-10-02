import { expect, test } from 'vitest';
import concretize from '#locale/concretize.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import { buildGlossarySearch } from '#locale/glossarySearch.ts';
import type LocaleText from '#locale/LocaleText.ts';
import Locales from '#locale/Locales.ts';
import { searchItems } from '#util/search.ts';

function toLocales(locale: LocaleText) {
    return new Locales(concretize, [locale], DefaultLocale);
}

/** en-US, but with one glossary term's definition replaced. */
function localeWithDefinition(
    id: 'value' | 'type',
    definition: string,
): LocaleText {
    return {
        ...DefaultLocale,
        glossary: {
            ...DefaultLocale.glossary,
            [id]: { ...DefaultLocale.glossary[id], definition },
        },
    };
}

function search(locales: Locales, query: string) {
    return searchItems(
        buildGlossarySearch(locales),
        query,
        locales.getLanguages(),
    ).map(([id]) => id);
}

test('matches a term by its word', () => {
    expect(search(toLocales(DefaultLocale), 'value')).toContain('value');
});

test('matches a term by its definition text', () => {
    const locales = toLocales(
        localeWithDefinition('value', 'A wuzzlebark the program computes.'),
    );
    expect(search(locales, 'wuzzlebark')).toEqual(['value']);
});

test('matches a term by one of its other written forms', () => {
    // en-US declares "parameters" as a form of `parameter`.
    expect(search(toLocales(DefaultLocale), 'parameters')).toContain(
        'parameter',
    );
});

test('a word match ranks above a definition-only match', () => {
    const locales = toLocales(
        localeWithDefinition('type', 'Describes a kind of value.'),
    );
    const ids = search(locales, 'value');
    expect(ids.indexOf('value')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('value')).toBeLessThan(ids.indexOf('type'));
});
