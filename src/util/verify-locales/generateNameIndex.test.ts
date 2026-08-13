import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import {
    findLocalesNaming,
    findLocalesWithKeyword,
    isLocaleNameIndexLoaded,
    setLocaleNameIndex,
    type LocaleNameIndex,
} from '@locale/localeNameIndex';
import { buildNameIndex } from '@util/verify-locales/generateNameIndex';
import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, expect, test } from 'vitest';

const es = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
) as LocaleText;

afterEach(() => setLocaleNameIndex(undefined));

test('the index records each locale’s own basis names, not the fallback’s', () => {
    const index = buildNameIndex([DefaultLocale, es]);

    const english = index.names['en-US'].split(' ');
    const spanish = index.names['es-MX'].split(' ');

    expect(english).toContain('Phrase');
    expect(spanish).toContain('Frase');
    // Built with each locale as its own fallback, so English names don't leak into Spanish.
    expect(spanish).not.toContain('Phrase');

    // Names en-US binds at the same definition are dropped: `💬` is Phrase's symbolic name in
    // both, and it binds in every project through the en-US fallback, so no project could
    // ever be missing Spanish because of it.
    expect(english).toContain('💬');
    expect(spanish).not.toContain('💬');

    // Keyword words come from the locale's `keyword` block, and are never reduced — the
    // keyword index is built from the declared locales with no fallback appended.
    expect(index.keywords['es-MX'].split(' ')).toContain('función');
    expect(index.keywords['en-US'].split(' ')).toContain('function');

    // Documentation is skipped: a name used in a Spanish doc example is not a name Spanish
    // binds, and suggesting a language on that basis would be wrong.
    expect(spanish.every((name) => !/\s/.test(name))).toBe(true);
    // And nothing arrives still wearing a write-status annotation.
    expect(spanish.every((name) => !name.startsWith('$'))).toBe(true);
});

test('the index cannot be built without the locale it is defined against', () => {
    // Silently emitting an unreduced table would fail the drift check forever, with nothing
    // saying why.
    expect(() => buildNameIndex([es])).toThrow(/en-US/);
});

test('lookups invert the artifact, and say "not loaded" apart from "nothing names it"', () => {
    expect(isLocaleNameIndexLoaded()).toBe(false);
    expect(findLocalesNaming('Frase')).toBeUndefined();

    const index: LocaleNameIndex = {
        names: { 'en-US': 'Phrase Stage', 'es-MX': 'Frase Escenario' },
        keywords: { 'en-US': '', 'es-MX': 'función' },
    };
    setLocaleNameIndex(index);

    expect(findLocalesNaming('Frase')).toEqual(['es-MX']);
    expect(findLocalesNaming('Phrase')).toEqual(['en-US']);
    // Loaded, but nothing names it — an empty list, not undefined.
    expect(findLocalesNaming('Satz')).toEqual([]);
    expect(findLocalesWithKeyword('función')).toEqual(['es-MX']);
    expect(findLocalesWithKeyword('Frase')).toEqual([]);
});

test('the committed artifact covers every supported locale and maps known words', () => {
    const artifact: unknown = JSON.parse(
        readFileSync(
            path.join(process.cwd(), 'static', 'locales', 'names.json'),
            'utf-8',
        ),
    );
    if (
        artifact === null ||
        typeof artifact !== 'object' ||
        !('names' in artifact) ||
        !('keywords' in artifact)
    )
        throw new Error('Malformed names.json');

    setLocaleNameIndex(artifact as LocaleNameIndex);

    // If this drifts, `npm run locales` has more to say; regenerate with `npm run locales-fix`.
    expect(findLocalesNaming('Frase')).toContain('es-MX');
    expect(findLocalesNaming('Phrase')).toContain('en-US');
    expect(findLocalesWithKeyword('función')).toContain('es-MX');
});

test('a word en-US spells the same but binds elsewhere survives the reduction', () => {
    const artifact: unknown = JSON.parse(
        readFileSync(
            path.join(process.cwd(), 'static', 'locales', 'names.json'),
            'utf-8',
        ),
    );
    setLocaleNameIndex(artifact as LocaleNameIndex);

    // These are the homographs a name-by-name subtraction against en-US would delete, and
    // each one is a real answer: `[1 2 3].sin(…)` doesn't resolve until Spanish is declared,
    // because in en-US `sin` is Number's sine and in es-MX it is List's `sans` ("without").
    expect(findLocalesNaming('sin')).toContain('es-MX');
    // `y` is Place's coordinate in en-US and Boolean's `and` in es-MX.
    expect(findLocalesNaming('y')).toContain('es-MX');
    // `combiner` is an input of List.combine in en-US and the function's own name in fr-FR.
    expect(findLocalesNaming('combiner')).toContain('fr-FR');

    // Whereas a name en-US binds at the same definition is gone from every other locale,
    // since the en-US fallback already provides it everywhere.
    expect(findLocalesNaming('💬')).toEqual(['en-US']);
    expect(findLocalesNaming('Color')).toEqual(['en-US']);
});
