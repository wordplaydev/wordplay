import DefaultLocale from '#locale/DefaultLocale.ts';
import Locales from '#locale/Locales.ts';
import concretize from '#locale/concretize.ts';
import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import evaluateCode from '#runtime/evaluate.ts';
import { expect, test } from 'vitest';

// `🌎/xx` is true when the reader's locale is the one named (LANGUAGE.md, Text). A tag without a
// region matches any region; a tag with one must match it; a tag may be written by name (#1220).
test.each([
    ['🌎/en', '⊤'],
    ['🌎/en-US', '⊤'],
    ['🌎/English', '⊤'],
    ['🌎/en-GB', '⊥'],
    ['🌎/es', '⊥'],
    ["🌎/en ? 'hello' 'hola'", '"hello"'],
])('%s in en-US is %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

// The answer follows the evaluator's preferred locales rather than being fixed. Built directly,
// because `Locales.getLocales()` appends en-US as a fallback, which `🌎/en` would then always see.
test.each([
    ['🌎/es', '⊤'],
    ['🌎/es-MX', '⊤'],
    ['🌎/es-ES', '⊥'],
    ['🌎/en', '⊥'],
])('%s when only es-MX is preferred is %s', (code, value) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [
        { ...DefaultLocale, language: 'es', regions: ['MX'] },
    ]);
    expect(evaluator.getInitialValue()?.toString()).toBe(value);
});

// A reader's locales are evaluated without the en-US fallback that backs up interface text, or
// `🌎/en` would be true for every reader. The region is one no shipped locale uses, because the
// basis cache is keyed by locale name (see Basis.test.ts).
test('the en-US fallback is not one of the reader’s locales', () => {
    const spanish = new Locales(
        concretize,
        [{ ...DefaultLocale, language: 'es', regions: ['MO'] }],
        DefaultLocale,
    );
    expect(
        evaluateCode("🌎/en ? 'hello' 'hola'", [], spanish)?.toString(),
    ).toBe('"hola"');
});
