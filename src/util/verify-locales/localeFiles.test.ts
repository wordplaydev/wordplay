import { describe, expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import {
    assembleLocale,
    LocaleSections,
    sectionFileFor,
    splitLocale,
    type LocaleSection,
} from '@util/verify-locales/localeFiles';

/**
 * A locale is authored in section files and consumed as one object, so the
 * split has exactly one property worth testing: it loses nothing. Everything
 * downstream — every check in `verifyLocale`, the schema validator, the path
 * classifiers — takes the assembled document, so if split-then-assemble is the
 * identity, none of them can tell the difference.
 */

/** The bundled en-US, which is code rather than corpus — the all-locales round
 *  trip lives in localeFilesSweep.test.ts. */
function defaultLocale(): Record<string, unknown> {
    const { $schema: _schema, ...locale } = { ...DefaultLocale };
    return locale;
}

describe('sectionFileFor', () => {
    test.each<[string, LocaleSection]>([
        ['ui.page.login.header', 'ui-page.json'],
        ['ui.dialog.share.header', 'ui.json'],
        ['ui.widget.slider', 'ui.json'],
        ['node.Program.name', 'node.json'],
        ['basis.List.function.add.names', 'basis.json'],
        ['input.Key.keys.0', 'input.json'],
        ['output.Phrase.names', 'output.json'],
        ['token.EvalOpen', 'token-keyword.json'],
        ['keyword.and', 'token-keyword.json'],
        ['glossary.value.forms', 'locale.json'],
        ['moderation.progress', 'locale.json'],
        // Top-level paths carry a leading dot in LocalePath's spelling.
        ['.language', 'locale.json'],
        ['.guidance', 'locale.json'],
    ])('%s belongs to %s', (localePath, section) => {
        expect(sectionFileFor(localePath)).toBe(section);
    });

    test('takes an array path as readily as a dotted one', () => {
        expect(sectionFileFor(['ui', 'page', 'login'])).toBe('ui-page.json');
        expect(sectionFileFor(['ui', 'dialog'])).toBe('ui.json');
    });

    test('an unknown top-level key falls to locale.json rather than throwing', () => {
        // A key added to LocaleText before this table knows about it should
        // land somewhere real; losing it would be silent data loss.
        expect(sectionFileFor('somethingNew.deeper')).toBe('locale.json');
    });
});

describe('split and assemble', () => {
    test('ui is split at page, and nowhere else', () => {
        const locale = defaultLocale();
        const sections = splitLocale(locale);
        const page = sections.get('ui-page.json');
        const rest = sections.get('ui.json');
        expect(page).toBeDefined();
        expect(rest).toBeDefined();
        const pageUI = page === undefined ? {} : Reflect.get(page, 'ui');
        const restUI = rest === undefined ? {} : Reflect.get(rest, 'ui');
        expect(Object.keys(pageUI ?? {})).toEqual(['page']);
        expect(Object.keys(restUI ?? {})).not.toContain('page');
    });

    test('an empty container survives, because locales legitimately ship them', () => {
        // `terms: {}` and 32 `basis.*.function.*.inputs: []` are real: the
        // functions take no inputs. A split that pruned empties would delete
        // them, and a migration that pruned them would corrupt every locale.
        const locale = defaultLocale();
        const back = assembleLocale(splitLocale(locale));
        expect(Reflect.get(back, 'terms')).toEqual({});
        const basis = Reflect.get(back, 'basis');
        const notFunction =
            basis === undefined || basis === null
                ? undefined
                : Reflect.get(
                      Reflect.get(Reflect.get(basis, 'Boolean'), 'function'),
                      'not',
                  );
        expect(Reflect.get(notFunction, 'inputs')).toEqual([]);
    });

    test('a key a locale lacks is not invented', () => {
        // Several locales ship without `keyword`, `musicsafety` or `guidance`.
        const sparse = { language: 'xx', ui: { dialog: { a: 'b' } } };
        const back = assembleLocale(splitLocale(sparse));
        expect(back).toEqual(sparse);
        expect(Object.keys(back)).not.toContain('keyword');
    });

    test('the section list and the splitter agree', () => {
        // A section the splitter can produce but `LocaleSections` omits would
        // be written and never read back.
        const locale = defaultLocale();
        for (const section of splitLocale(locale).keys())
            expect(LocaleSections).toContain(section);
    });

    test('assembly is a fixed point, so the assembled bytes never flip', () => {
        // The assembled file's content hash is what `versioned()` puts in its
        // URL, so if two paths through this code emitted the same content in a
        // different key order, the hash would flip back and forth and every
        // reader would re-download a locale that had not changed. Assembly is
        // canonical between sections and preserves order within one, which is
        // exactly enough: applying it again changes nothing.
        const once = assembleLocale(splitLocale(defaultLocale()));
        const twice = assembleLocale(splitLocale(once));
        expect(Object.keys(twice)).toEqual(Object.keys(once));
        expect(JSON.stringify(twice)).toEqual(JSON.stringify(once));
    });

    test('the bundled default locale round-trips', () => {
        const locale = defaultLocale();
        expect(assembleLocale(splitLocale(locale))).toEqual(locale);
    });
});
