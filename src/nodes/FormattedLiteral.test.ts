import DefaultLocales from '#locale/DefaultLocales.ts';
import concretize from '#locale/concretize.ts';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';
import DefaultLocale from '#locale/DefaultLocale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import Locales from '#locale/Locales.ts';
import evaluateCode from '#runtime/evaluate.ts';
import Project from '#db/projects/Project.ts';
import Caret from '#edit/caret/Caret.ts';
import { getEditsAt } from '#edit/menu/PossibleEdits.ts';
import Doc from '#nodes/Doc.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import Source from '#nodes/Source.ts';
import TextLiteral from '#nodes/TextLiteral.ts';

/** Load a few locales for testing. */
const en = DefaultLocale;
const es = JSON.parse(readFileSync('static/locales/es-MX/es-MX.json', 'utf8'));

test.each([
    ['`hello`', '`hello`', [en]],
    ['`hello`/', '`hello`', [en]],
    ['`hello`/en', '`hello`/en', [en]],
    ['`hello\\1\\world`/en', '`hello1world`/en', [en]],
    ['`hello\\"no"\\world`/en', '`hellonoworld`/en', [en]],
    ['`hello`', '`hello`', [en]],
    ['`hello`/en', '`hello`/en', [en]],
    ['`hello`/en`hola`/es', '`hello`/en', [en]],
    ['`hello`/en`hola`/es', '`hola`/es', [es]],
    ['`hello`/en`hola`/es', '`hola`/es', [es, en]],
    ['`hola`/es`hello`/en', '`hola`/es', [es, en]],
    ['`hola`/es`hello`/en', '`hello`/en', [en]],
])('%s -> %s', async (code, value, locales: LocaleText[]) => {
    const loc = new Locales(
        concretize,
        locales.length === 0 ? [en] : locales,
        DefaultLocale,
    );
    expect(evaluateCode(code, [], loc)?.toWordplay(loc)).toBe(value);
});

test.each([
    // Test JavaScript number translation.
    ['`hello`', '`hello`'],
    ['`hello`/', '`hello`'],
    ['`hello`/en', '`hello`/en'],
    ['`hello\\1\\world`/en', '`hello1world`/en'],
    ["`hello\\'no'\\world`/en", '`hellonoworld`/en'],
])('%s -> %s', (code, value) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});

// Markup → text (the `→ ''` conversion) must unescape doubled markup symbols the
// same way rendering does (Finding A).
test.each([
    ["(`a**b`) → ''", '"a*b"'],
    ["(`a@@b`) → ''", '"a@b"'],
    ["(`a__b`) → ''", '"a_b"'],
    ["(`a\\\\b`) → ''", '"a\\b"'],
])('%s value -> %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test('formatted text made from the edit menu can render', () => {
    // The renderer refuses markup without spaces, which every menu-made
    // formatted literal and doc lacked; parsing always supplies them.
    const source = new Source('t', "Phrase('hello there')");
    const project = Project.make(null, 't', source, [], DefaultLocale);
    const text = source.nodes().find((n) => n instanceof TextLiteral);
    expect(text).toBeDefined();
    const made = getEditsAt(
        project,
        new Caret(source, text!, undefined, undefined),
        undefined,
        DefaultLocales,
    )
        .map((revision) => revision.getEdit(DefaultLocales))
        .flatMap((edit) => (Array.isArray(edit) ? [edit[0]] : []))
        .flatMap((edited) =>
            edited.nodes().filter((n) => n instanceof FormattedLiteral),
        );
    expect(made.length).toBeGreaterThan(0);
    for (const literal of made)
        for (const translation of literal.texts)
            expect(translation.markup.spaces).toBeDefined();
    expect(Doc.make([]).markup.spaces).toBeDefined();
});
