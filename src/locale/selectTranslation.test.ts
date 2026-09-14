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
        // Simulate a partial/stale locale that lacks a newly added key. The
        // key is deleted rather than typed away, since a stale locale file is
        // missing it at runtime while the type still promises it.
        const partial: LocaleText = structuredClone(DefaultLocale);
        Reflect.deleteProperty(partial.output.Color, 'lighter');

        expect(
            selectTranslation(partial, (l) => l.output.Color.lighter.doc),
        ).toBe(DefaultLocale.output.Color.lighter.doc);
    });
});

describe('basis builders tolerate incomplete locales', () => {
    test('getDocLocales does not throw on a locale missing a key', () => {
        const partial: LocaleText = structuredClone(DefaultLocale);
        Reflect.deleteProperty(partial.basis.Boolean, 'doc');

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
