import { describe, expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import selectTranslation from '@locale/selectTranslation';
import DefaultLocales from '@locale/DefaultLocales';
import { getDocLocales } from '@locale/getDocLocales';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';

describe('selectTranslation', () => {
    test('returns the locale value when present', () => {
        expect(
            selectTranslation(DefaultLocale, (l) => l.output.Color.lighter.doc),
        ).toBe(DefaultLocale.output.Color.lighter.doc);
    });

    test('falls back to the default locale when a key is missing', () => {
        // Simulate a partial/stale locale that lacks a newly added key.
        const partial = {
            ...DefaultLocale,
            output: {
                ...DefaultLocale.output,
                Color: {
                    ...DefaultLocale.output.Color,
                    // Drop a key newer code expects.
                    lighter: undefined,
                },
            },
        } as unknown as LocaleText;

        expect(
            selectTranslation(partial, (l) => l.output.Color.lighter.doc),
        ).toBe(DefaultLocale.output.Color.lighter.doc);
    });
});

describe('basis builders tolerate incomplete locales', () => {
    test('getDocLocales does not throw on a locale missing a key', () => {
        const partial = {
            ...DefaultLocale,
            basis: {
                ...DefaultLocale.basis,
                Boolean: {
                    ...DefaultLocale.basis.Boolean,
                    doc: undefined,
                },
            },
        } as unknown as LocaleText;

        const locales = new Locales(concretize, [partial], DefaultLocale);
        expect(() =>
            getDocLocales(locales, (l) => l.basis.Boolean.doc),
        ).not.toThrow();
    });

    test('default locales still build docs', () => {
        expect(() =>
            getDocLocales(DefaultLocales, (l) => l.basis.Boolean.doc),
        ).not.toThrow();
    });
});
