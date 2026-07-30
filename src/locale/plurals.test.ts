import { Languages } from '@locale/LanguageCode';
import {
    getPluralCategories,
    getPluralCount,
    getPluralExamples,
    PluralCategories,
    selectPluralIndex,
} from '@locale/plurals';
import { expect, test } from 'vitest';

test('categories come back in canonical order, not alphabetical', () => {
    // Intl reports Arabic's as few,many,one,two,zero,other; arms are written
    // zero-first, so the sort is load-bearing.
    expect(getPluralCategories('ar')).toEqual([
        'zero',
        'one',
        'two',
        'few',
        'many',
        'other',
    ]);
    expect(getPluralCategories('pl')).toEqual(['one', 'few', 'many', 'other']);
});

test.each([
    ['en', 2],
    ['ja', 1],
    ['zh', 1],
    ['ko', 1],
    ['fr', 3],
    ['pl', 4],
    ['ar', 6],
])('%s needs %i plural form(s)', (language, count) => {
    expect(getPluralCount(language)).toBe(count);
});

test('an unknown or multilingual tag degrades to one form', () => {
    // `en_es` is our multilingual tag shape, which Intl rejects.
    expect(getPluralCategories('en_es')).toEqual(['other']);
    expect(getPluralCount('nonsense!')).toBe(1);
    expect(selectPluralIndex('nonsense!', 5)).toBe(0);
});

test('values select the arm their category sits at', () => {
    // English: one, other.
    expect(selectPluralIndex('en', 1)).toBe(0);
    for (const n of [0, 2, 5, 11, 100])
        expect(selectPluralIndex('en', n)).toBe(1);

    // Japanese has a single form, so every value picks arm 0.
    for (const n of [0, 1, 2, 100]) expect(selectPluralIndex('ja', n)).toBe(0);

    // Polish: one, few, many, other.
    expect(selectPluralIndex('pl', 1)).toBe(0);
    expect(selectPluralIndex('pl', 2)).toBe(1);
    expect(selectPluralIndex('pl', 5)).toBe(2);

    // Arabic: zero, one, two, few, many, other.
    expect(selectPluralIndex('ar', 0)).toBe(0);
    expect(selectPluralIndex('ar', 1)).toBe(1);
    expect(selectPluralIndex('ar', 2)).toBe(2);
    expect(selectPluralIndex('ar', 3)).toBe(3);
    expect(selectPluralIndex('ar', 11)).toBe(4);
});

test('every category has an example that selects it, in every language', () => {
    // Translators are shown these numbers beside each arm, so an example that
    // doesn't actually select its own form would teach the wrong thing. Some
    // categories are reachable only by large numbers (French `many`) or by
    // decimals (Polish `other`, Czech `many`), which is why the probe list
    // covers both.
    for (const language of Object.keys(Languages)) {
        const examples = getPluralExamples(language);
        expect(examples).toHaveLength(getPluralCount(language));
        examples.forEach((example, index) =>
            expect(
                selectPluralIndex(language, example),
                `${language} example ${example} for form ${index}`,
            ).toBe(index),
        );
    }
});

test('no language uses a category outside the canonical six', () => {
    // The design assumes CLDR's category set is closed, so arm order is fixed
    // and a locale we add later needs no code change. If ICU ever grows a
    // seventh category, this fails rather than silently mis-ordering arms.
    const canonical = new Set<string>(PluralCategories);
    const outside = new Set<string>();
    for (const language of Object.keys(Languages)) {
        for (const type of ['cardinal', 'ordinal'] as const) {
            let categories: readonly string[];
            try {
                categories = new Intl.PluralRules(language, {
                    type,
                }).resolvedOptions().pluralCategories;
            } catch {
                continue;
            }
            for (const category of categories)
                if (!canonical.has(category)) outside.add(category);
        }
    }
    expect([...outside]).toEqual([]);
});
