import DefaultLocale from '@locale/DefaultLocale';
import { stringToLocale } from '@locale/Locale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import translateProjectContent, {
    type RawTranslator,
    sanitizeTranslatedName,
} from './translateProjectContent';
import { isName } from '@parser/Tokenizer';

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');

/** A fake translator with a fixed source→target dictionary, echoing anything
 *  unknown so the test is deterministic and needs no network. */
function fakeTranslator(dictionary: Record<string, string>): RawTranslator {
    return async (texts) => texts.map((t) => dictionary[t] ?? t);
}

test('replace mode rewrites names, their references, and text into the target language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A bind, a text literal, and a reference to the bind.
    const source = new Source('start', 'cat: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ cat: 'gato', meow: 'miau' }),
        undefined,
        true,
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';

    // The name and its reference are replaced (not added alongside the source).
    expect(out).toContain('gato');
    expect(out).not.toContain('cat');
    // The text literal is replaced in place.
    expect(out).toContain('miau');
    expect(out).not.toContain('meow');
});

test('sanitizeTranslatedName swaps apostrophe-like delimiters for U+02BC and validates', () => {
    // ASCII and curly apostrophes are string delimiters → swapped for the modifier
    // letter apostrophe, which reads the same and is a valid name character.
    expect(sanitizeTranslatedName("o'brien")).toBe('oʼbrien');
    expect(sanitizeTranslatedName('o’brien')).toBe('oʼbrien');
    expect(isName(sanitizeTranslatedName("o'brien") ?? '')).toBe(true);
    // Already valid names pass through unchanged.
    expect(sanitizeTranslatedName('gato')).toBe('gato');
    expect(sanitizeTranslatedName('oʼbrien')).toBe('oʼbrien');
    // A name with some other reserved character can't be salvaged → undefined.
    expect(sanitizeTranslatedName('a+b')).toBeUndefined();
});

test('a translation that would put an apostrophe in a name keeps the identifier valid', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', 'joe: 5\njoe');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ joe: "o'brien" }),
        undefined,
        true,
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    // The broken ASCII apostrophe must never reach the program text.
    expect(out).not.toContain("o'brien");
    // It's localized to the valid modifier-letter form, and still parses cleanly.
    expect(out).toContain('oʼbrien');
    expect(out).not.toContain('joe');
});

test('add mode keeps the source name and adds the target as another option', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A language-tagged source name, so adding the target keeps both.
    const source = new Source('start', 'cat/en: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ cat: 'gato', meow: 'miau' }),
        undefined,
        // replace defaults to false
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';

    // Both the source and target names are present (multilingual).
    expect(out).toContain('cat');
    expect(out).toContain('gato');
});

// The pooled example path in ClaudeTranslator depends on extraction being
// deterministic: it runs translateProjectContent once with a recording
// translator (which returns null, aborting the pass before any tree rewriting)
// to learn what would be requested, translates the union of all examples'
// texts in shared chunks, then runs again resolving from that pool. If the two
// passes ever requested different texts, examples would silently keep English.
test('a gather pass then a lookup pass equals one direct pass', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const code = 'cat: "meow"\ncat';
    const dictionary: Record<string, string> = { cat: 'gato', meow: 'miau' };
    const make = () =>
        Project.make(
            null,
            'test',
            new Source('start', code),
            [],
            DefaultLocale,
        );

    const direct = await translateProjectContent(
        make(),
        en,
        es,
        fakeTranslator(dictionary),
        undefined,
        true,
    );

    // Gather: record what was requested; returning null aborts the pass.
    const requested: string[] = [];
    const gathered = await translateProjectContent(
        make(),
        en,
        es,
        (texts) => {
            requested.push(...texts);
            return Promise.resolve(null);
        },
        undefined,
        true,
    );
    expect(gathered).toBeNull();
    expect(requested.length).toBeGreaterThan(0);

    // Apply: resolve the recorded texts from a prebuilt pool.
    const pool = new Map(requested.map((t) => [t, dictionary[t] ?? t]));
    const applied = await translateProjectContent(
        make(),
        en,
        es,
        (texts) => Promise.resolve(texts.map((t) => pool.get(t) ?? t)),
        undefined,
        true,
    );

    expect(applied).not.toBeNull();
    expect(applied?.getSources()[0].toWordplay()).toBe(
        direct?.getSources()[0].toWordplay(),
    );
});

// An emoji- or symbol-only name isn't translatable prose: sending it invites
// the model to invent a word for it (which is how 🔈 once became a spelled-out
// noun). Such a bind keeps its name; its references still resolve.
test('a name with no letters is never sent for translation', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const source = new Source('start', '🔈: "meow"\n🔈');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const requested: string[] = [];
    const result = await translateProjectContent(
        project,
        en,
        es,
        (texts) => {
            requested.push(...texts);
            return Promise.resolve(texts.map((t) => `X${t}`));
        },
        undefined,
        true,
    );

    expect(requested).not.toContain('🔈');
    const out = result?.getSources()[0].toWordplay() ?? '';
    expect(out).toContain('🔈');
});

test('validation leaves a clean translation alone', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', 'cat: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ cat: 'gato', meow: 'miau' }),
        undefined,
        true,
        { validate: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    expect(out).toContain('gato');
    expect(out).toContain('miau');
});

test('phases are reported in order', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', 'cat: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const phases: string[] = [];
    await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ cat: 'gato' }),
        undefined,
        true,
        { phase: (phase) => phases.push(phase) },
    );

    expect(phases).toEqual(['analyzing', 'revising']);
});

test('strings the translator leaves undefined keep their source', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // What a partly-failed chunked translation looks like from here: some
    // entries translated, some undefined. The undefined ones must not blank
    // anything out.
    const source = new Source('start', 'cat: "meow"\ncat');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => texts.map((t) => (t === 'cat' ? 'gato' : undefined)),
        undefined,
        true,
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    expect(out).toContain('gato');
    // The text kept its source rather than becoming empty.
    expect(out).toContain('meow');
});
