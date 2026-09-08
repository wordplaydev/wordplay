import type Locale from '@locale/Locale';
import { describe, expect, test } from 'vitest';
import chooseSplitLocales from './splitLocales';

const en: Locale = { language: 'en', regions: ['US'] };
const es: Locale = { language: 'es', regions: ['MX'] };
const fr: Locale = { language: 'fr', regions: ['FR'] };

describe('chooseSplitLocales', () => {
    test('a program with no languages leaves both views unset', () => {
        expect(chooseSplitLocales([], null, [en])).toEqual({
            primary: null,
            view: null,
        });
    });

    /* Nothing to contrast, so the second view stays on the placeholder rather
       than echoing the first — two views of one language would say nothing. */
    test('one language sets the first view and leaves the second unset', () => {
        expect(chooseSplitLocales([es], null, [en])).toEqual({
            primary: es,
            view: null,
        });
    });

    test('two languages are split between the views', () => {
        expect(chooseSplitLocales([en, es], null, [en])).toEqual({
            primary: en,
            view: es,
        });
    });

    /* The reader keeps reading the language they know; the other view is the
       one that teaches. Order in `used` is tag-appearance order, not preference. */
    test("the reader's own language goes to the view they already had", () => {
        expect(chooseSplitLocales([es, fr, en], null, [en])).toEqual({
            primary: en,
            view: es,
        });
    });

    /* A program's locales come from language tags and carry no region, while a
       reader's always does. Comparing them whole matches nothing, which handed
       an English reader the French view of FrenchNumbers. */
    test("the reader's language matches a region-less program locale", () => {
        const bare: Locale = { language: 'en', regions: [] };
        expect(chooseSplitLocales([fr, bare], null, [en])).toEqual({
            primary: bare,
            view: fr,
        });
    });

    test('a language the reader does not have falls back to the first used', () => {
        expect(chooseSplitLocales([es, fr], null, [en])).toEqual({
            primary: es,
            view: fr,
        });
    });

    /* A choice already made is a choice: a split must never move a view the
       reader deliberately set. */
    test('an existing choice is kept and the other view differs from it', () => {
        expect(chooseSplitLocales([en, es, fr], fr, [en])).toEqual({
            primary: fr,
            view: en,
        });
    });

    test('an existing choice that is the only used language leaves the second unset', () => {
        expect(chooseSplitLocales([es], es, [en])).toEqual({
            primary: es,
            view: null,
        });
    });

    /* Region is part of identity, so two regions of one language are a real
       contrast and must not collapse. */
    test('two regions of one language are distinct', () => {
        const mx: Locale = { language: 'es', regions: ['MX'] };
        const ar: Locale = { language: 'es', regions: ['AR'] };
        expect(chooseSplitLocales([mx, ar], null, [])).toEqual({
            primary: mx,
            view: ar,
        });
    });
});
