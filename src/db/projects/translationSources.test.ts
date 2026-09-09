import { stringToLocale, type Locale } from '@locale/Locale';
import type Name from '@nodes/Name';
import Names from '@nodes/Names';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import { expect, test } from 'vitest';
import { chooseNameSource, chooseTextSource } from './translationSources';

function locale(text: string): Locale {
    const value = stringToLocale(text);
    if (value === undefined) throw new Error(`bad locale ${text}`);
    return value;
}

const en = locale('en-US');
const es = locale('es-ES');
const fr = locale('fr-FR');

/** The names of the first bind in a parsed program, so every tag is a real
 *  one the tokenizer produced rather than a hand-built node. */
function names(code: string): Name[] {
    const node = new Source('test', `${code}: 1`)
        .nodes()
        .find((n): n is Names => n instanceof Names);
    if (node === undefined) throw new Error(`no names in ${code}`);
    return node.names;
}

/** The options of the first text literal in a parsed program. */
function options(code: string) {
    const node = new Source('test', code)
        .nodes()
        .find((n): n is TextLiteral => n instanceof TextLiteral);
    if (node === undefined) throw new Error(`no literal in ${code}`);
    return node.getOptions();
}

test('an option in the chosen language wins, and is sourced from it', () => {
    const all = options(`'hello'/en'hola'/es`);
    const source = chooseTextSource(all, all[0], en, [en, es], false);
    expect(source?.option).toBe(all[0]);
    expect(source?.from).toEqual(en);
});

test('an untagged option beats a tagged one when nothing is in the chosen language', () => {
    // An untagged option is the creator's own writing, so it is the source
    // before any tag is consulted.
    const all = options(`'hola'/es'hello'`);
    const source = chooseTextSource(all, undefined, en, [en, es], false);
    expect(source?.option).toBe(all[1]);
    expect(source?.from).toEqual(en);
});

test('a literal with only another language sources from its own tag', () => {
    // Today this fell through to `getOptions()[0]` and was sent to the model
    // labeled as the chosen language (#653).
    const all = options(`'hola'/es`);
    const source = chooseTextSource(all, undefined, en, [en], false);
    expect(source?.from.language).toBe('es');
});

test('an untagged name sources from the chosen language', () => {
    const source = chooseNameSource(names('cat'), en, [en], false);
    expect(source?.option.getName()).toBe('cat');
    expect(source?.from).toEqual(en);
});

test('`cat, gato/en` with chosen en still picks `cat`', () => {
    // The first step is one `find` over "tagged with the chosen language OR
    // untagged", which interleaves the two by source order. Splitting it into
    // two steps would pick `gato` here.
    const source = chooseNameSource(names('cat, gato/en'), en, [en], false);
    expect(source?.option.getName()).toBe('cat');
});

test('a name tagged only in another language translates, sourced from its tag', () => {
    // Today this returned undefined and the bind was skipped entirely (#653).
    const source = chooseNameSource(names('gato/es'), en, [en], false);
    expect(source?.option.getName()).toBe('gato');
    expect(source?.from.language).toBe('es');
});

test('a tag naming no region adopts the declared locale of that language', () => {
    // So `/es` and a declared `es-ES` make one group rather than two.
    const source = chooseNameSource(names('gato/es'), en, [en, es], false);
    expect(source?.from).toEqual(es);
});

test('a tag naming a region keeps its own region', () => {
    const source = chooseNameSource(names('gato/es-MX'), en, [en, es], false);
    expect(source?.from.regions).toEqual(['MX']);
});

test('a declared language beats an undeclared one whatever the source order', () => {
    const source = chooseNameSource(
        names('mot/fr, gato/es'),
        en,
        [en, es],
        false,
    );
    expect(source?.option.getName()).toBe('gato');
    expect(source?.from).toEqual(es);
});

test('an undeclared tag still sources from itself when nothing else can', () => {
    const source = chooseNameSource(names('mot/fr'), en, [en], false);
    expect(source?.from.language).toBe('fr');
});

test('a multilingual tag sources as itself, not as its primary language', () => {
    // `/es_en` is written in both, so reducing it to `es` would drop the
    // English half — the very complaint in #653.
    const source = chooseNameSource(
        names('holaGentleman/es_en'),
        fr,
        [],
        false,
    );
    expect(source?.from.language).toBe('es');
    expect(source?.from.multilingual).toEqual(['es', 'en']);
});

test('an unresolvable tag falls back to the chosen language', () => {
    const source = chooseNameSource(names('word/aaa'), en, [en], false);
    expect(source?.from).toEqual(en);
});

test('preserveTagged always yields untagged content, sourced from the chosen language', () => {
    // A tag means content that must ship verbatim (#1310), so a tagged option
    // is never a source and the run is always one group.
    expect(
        chooseNameSource(
            names('cat, gato/es'),
            en,
            [en, es],
            true,
        )?.option.getName(),
    ).toBe('cat');
    expect(
        chooseNameSource(names('gato/es, mot/fr'), en, [en, es], true),
    ).toBeUndefined();
    expect(
        chooseNameSource(names('holaGentleman/es_en'), en, [en], true),
    ).toBeUndefined();

    const all = options(`'hola'/es'hello'`);
    const kept = chooseTextSource(all, undefined, en, [en, es], true);
    expect(kept?.option).toBe(all[1]);
    expect(kept?.from).toEqual(en);
    expect(
        chooseTextSource(options(`'hola'/es`), undefined, en, [en], true),
    ).toBeUndefined();
});
