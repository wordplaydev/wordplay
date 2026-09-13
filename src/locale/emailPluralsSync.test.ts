import { describe, expect, test } from 'vitest';
// The server's own copy, which an email uses to pick a plural arm.
// `functions/` compiles with its own `rootDir` and cannot import this side;
// this side can import it, which is what lets one table hold both to the same
// contract. A drift would mail someone the wrong arm of their own language.
import {
    getPluralCategories as categoriesOnServer,
    PluralCategories as CategoriesOnServer,
    selectPluralIndex as selectOnServer,
} from '../../functions/src/email/plurals';
import { SupportedLocales } from './SupportedLocales';
import {
    getPluralCategories,
    PluralCategories,
    selectPluralIndex,
} from './plurals';

describe('the email picks the same plural arm as the app', () => {
    test('both know the same categories, in the same order', () => {
        expect([...CategoriesOnServer]).toEqual([...PluralCategories]);
    });

    const languages = [
        ...new Set(
            SupportedLocales.map((locale) => locale.split('-')[0] ?? ''),
        ),
        // A malformed or unknown tag, which must degrade rather than throw.
        '',
        'zz',
    ];

    test.each(languages)('%s distinguishes the same forms', (language) => {
        expect(categoriesOnServer(language)).toEqual(
            getPluralCategories(language),
        );
    });

    // Small integers, the large values French and Spanish reserve `many` for,
    // and the fractions Polish and Czech reach a category with at all.
    const values = [0, 1, 2, 3, 5, 11, 21, 100, 1000000, 0.5, 1.5, 2.5];

    test.each(languages)(
        '%s selects the same arm for each value',
        (language) => {
            for (const value of values)
                expect(
                    selectOnServer(language, value),
                    `${language} at ${value}`,
                ).toBe(selectPluralIndex(language, value));
        },
    );
});
