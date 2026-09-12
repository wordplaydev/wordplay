import DefaultLocale from '@locale/DefaultLocale';
import { localeToString, stringToLocale } from '@locale/Locale';
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

// The `preserveTagged` rewrite mode is what the gallery-example pipeline uses
// (#1310): an explicit language tag marks pedagogical content — a French word
// in a French-teaching example — that must ship verbatim in every locale.
// Only untagged text and names are the file's "own language" and translate.

test('preserveTagged: a tagged text option survives rewrite and the untagged one translates', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source(
        'start',
        `greeting: 'hello''bonjour'/fr\ngreeting`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ hello: 'hola', bonjour: 'WRONG' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    expect(out).toContain(`'hola'`);
    expect(out).toContain(`'bonjour'/fr`);
    expect(out).not.toContain('hello');
    expect(out).not.toContain('WRONG');
});

test('preserveTagged: a fully-tagged literal is content and is left whole', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `word: 'un'/fr\nword`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ un: 'WRONG', word: 'palabra' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    expect(out).toContain(`'un'/fr`);
    expect(out).not.toContain('WRONG');
    // The untagged name still translates and its reference follows.
    expect(out).toContain('palabra');
    expect(out).not.toContain('word');
});

test('preserveTagged: tagged names survive a rename and separators stay valid', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `word, mot/fr: 1\nword`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ word: 'palabra' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].code.toString() ?? '';
    expect(out).toContain('palabra');
    expect(out).toContain('mot/fr');
    expect(out).not.toContain('word');
    // The rebuilt list must reparse to the same two names — a missing or
    // trailing separator would silently truncate it (see parseNames).
    const reparsed = new Source('start', out);
    const conflicts = Project.make(
        null,
        'test',
        reparsed,
        [],
        DefaultLocale,
    ).analyze().conflictedNodes.size;
    expect(conflicts).toBe(0);
});

test('preserveTagged: a reference spelled with a tagged name keeps its spelling', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // The program calls the bind by its tagged French name on purpose.
    const source = new Source('start', `word, mot/fr: 1\nmot`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ word: 'palabra' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].code.toString() ?? '';
    // The bind is renamed, but the deliberate tagged spelling stays.
    expect(out).toContain('palabra');
    expect(out).toMatch(/\nmot$/);
});

test('preserveTagged: a tagged doc option survives and the untagged one translates', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `¶hello¶\n¶bonjour¶/fr\nx: 1`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ hello: 'hola', bonjour: 'WRONG' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    expect(out).toContain('¶hola¶');
    expect(out).toContain('¶bonjour¶/fr');
    expect(out).not.toContain('hello');
});

test('preserveTagged: a tagged target-language option is the translation and nothing collapses', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `greeting: 'hello''hola'/es\ngreeting`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ hello: 'WRONG' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].toWordplay() ?? '';
    // Both options remain: the tagged one already serves target readers, and
    // collapsing is exactly what preserveTagged exists to prevent.
    expect(out).toContain(`'hello'`);
    expect(out).toContain(`'hola'/es`);
    expect(out).not.toContain('WRONG');
});

test('preserveTagged: a bind already named in the target language is not renamed', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `word, palabra/es: 1\nword`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        fakeTranslator({ word: 'WRONG' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].code.toString() ?? '';
    // The untagged name stays; inventing a second Spanish word would either
    // duplicate the tagged one or add a spurious synonym.
    expect(out).toContain('word');
    expect(out).toContain('palabra/es');
    expect(out).not.toContain('WRONG');
});

test('a unary operator keeps its symbol rather than a word that glues onto its operand', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // Rewriting `~` to a locale's word name (es-MX names it `no`) produced
    // `nocellHolds` — one unresolvable name token — and refused every example
    // using unary not. Operators, unary and binary alike, stay symbolic.
    const source = new Source('start', 'cellHolds: ⊤\n~cellHolds');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const result = await translateProjectContent(
        project,
        en,
        es,
        // Names arrive camelCase-split for better translation.
        fakeTranslator({ 'cell Holds': 'celda ocupada' }),
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].code.toString() ?? '';
    expect(out).toContain('~celdaOcupada');
});

// --- Several source languages in one project (#653) ---

/** What one call to the translator was asked for. */
type Ask = { texts: string[]; from: string };

/** A translator that records every call, so a test can assert not just what
 *  came back but what language each batch was said to be written in. */
function spy(
    dictionary: Record<string, string>,
    options?: { failFrom?: string },
): { translate: RawTranslator; asks: Ask[] } {
    const asks: Ask[] = [];
    return {
        asks,
        translate: async (texts, from) => {
            asks.push({ texts: [...texts], from: localeToString(from) });
            if (options?.failFrom === localeToString(from)) return null;
            return texts.map((text) => dictionary[text] ?? text);
        },
    };
}

test('a name tagged in another language is translated, from that language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // Before, `mot/fr` matched neither "tagged en" nor "untagged", so the bind
    // was skipped entirely and nothing was sent at all.
    const source = new Source('start', 'mot/fr: 1\nmot');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({ mot: 'palabra' });

    const result = await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        false,
    );

    expect(backend.asks).toHaveLength(1);
    expect(backend.asks[0]).toEqual({ texts: ['mot'], from: 'fr' });
    expect(result?.getSources()[0].code.toString()).toContain('palabra');
});

test('rewriting collapses a name tagged in another language too', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', 'mot/fr: 1\nmot');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({ mot: 'palabra' });

    const result = await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        true,
    );

    const out = result?.getSources()[0].code.toString() ?? '';
    expect(out).toContain('palabra');
    expect(out).not.toContain('mot');
});

test('a literal with no option in the chosen language is sent as its own language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // Before, this fell through to `getOptions()[0]` and was sent labeled `en`.
    const source = new Source('start', `'bonjour'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({ bonjour: 'hola' });

    await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        false,
    );

    expect(backend.asks).toHaveLength(1);
    expect(backend.asks[0].from).toBe('fr');
});

test('a project written in two languages makes one call per language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `cat: 'hello'\nchien: 'bonjour'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({
        cat: 'gato',
        hello: 'hola',
        chien: 'perro',
        bonjour: 'hola',
    });

    await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        false,
    );

    const byLanguage = new Map(
        backend.asks.map((ask) => [ask.from, ask.texts]),
    );
    expect(backend.asks).toHaveLength(2);
    // Each batch carries only its own language's strings — `chien` is an
    // untagged name, so it belongs to the untagged group, not the French one.
    expect(byLanguage.get('en-US')?.sort()).toEqual(['cat', 'chien', 'hello']);
    expect(byLanguage.get('fr')).toEqual(['bonjour']);
});

test('the same words in two languages get two translations, not one', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // `no` means different things in English and French, so keying translations
    // by text alone would give both whichever answer arrived last.
    const source = new Source('start', `a: 'no'\nb: 'no'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const asked: string[] = [];
    const translate: RawTranslator = async (texts, from) => {
        asked.push(localeToString(from));
        return texts.map((text) =>
            text === 'no'
                ? localeToString(from) === 'fr'
                    ? 'nofrances'
                    : 'noingles'
                : text,
        );
    };

    const result = await translateProjectContent(
        project,
        en,
        es,
        translate,
        undefined,
        true,
    );

    const out = result?.getSources()[0].code.toString() ?? '';
    expect(asked.sort()).toEqual(['en-US', 'fr']);
    expect(out).toContain('noingles');
    expect(out).toContain('nofrances');
});

test('tagged content still translates when the target is the untagged language', async () => {
    if (es === undefined) throw new Error('bad locale');

    // The single source/target comparison this replaces stopped the whole run.
    // Now only the Spanish group is skipped; the French one still goes.
    const source = new Source('start', `a: 'hola'\nb: 'bonjour'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({ bonjour: 'hola', b: 'be' });

    await translateProjectContent(
        project,
        es,
        es,
        backend.translate,
        undefined,
        false,
    );

    expect(backend.asks).toHaveLength(1);
    expect(backend.asks[0].from).toBe('fr');
});

test('plan fires once with the total across every language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `cat: 'hello'\nchien: 'bonjour'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({});
    const planned: number[] = [];

    await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        false,
        { plan: (strings) => planned.push(strings) },
    );

    const sent = backend.asks.reduce(
        (total, ask) => total + ask.texts.length,
        0,
    );
    expect(planned).toHaveLength(1);
    expect(planned[0]).toBe(sent);
});

test('one failed language keeps the other language’s translations', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    const source = new Source('start', `cat: 'hello'\nchien: 'bonjour'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy(
        { cat: 'gato', hello: 'hola', bonjour: 'buenos' },
        { failFrom: 'fr' },
    );

    const result = await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        true,
    );

    const out = result?.getSources()[0].code.toString() ?? '';
    expect(result).not.toBeNull();
    expect(out).toContain('gato');
    // The French batch failed, so its words stand rather than being lost.
    expect(out).toContain('bonjour');
});

test('every language failing is a failed translation', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // The locale CLI's gather pass depends on this exactly: its translator
    // records what it is asked for and returns null for every batch.
    const source = new Source('start', `cat: 'hello'\nchien: 'bonjour'/fr`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const gathered: string[] = [];

    const result = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => {
            gathered.push(...texts);
            return null;
        },
        undefined,
        true,
    );

    expect(result).toBeNull();
    // Every batch was issued before any was awaited, so the gather pass sees
    // all of the project's strings and not just the first language's.
    expect(gathered).toContain('bonjour');
    expect(gathered).toContain('cat');
});

test('preserveTagged still makes exactly one call, in the chosen language', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A tag means content that must ship verbatim (#1310), so a project full of
    // tagged options is still one group sourced from the caller's language.
    const source = new Source(
        'start',
        `cat: 'hello'\nb: 'bonjour'/fr'hola'/es`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({ cat: 'gato', hello: 'hola' });

    const result = await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        true,
        { preserveTagged: true },
    );

    expect(backend.asks).toHaveLength(1);
    expect(backend.asks[0].from).toBe('en-US');
    // The tagged options are untouched.
    const out = result?.getSources()[0].code.toString() ?? '';
    expect(out).toContain('bonjour');
    expect(out).toContain('hola');
});

test("a doc's embedded example reaches the translator with its spaces", async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // `toWordplay()` drops every space it isn't given, so extracting a doc without the
    // source's `Spaces` sent `Phrase(a 2m color: b)` as `Phrase(a2mcolor:b)` — the model
    // translated the prose around code that had been run together, and what came back no
    // longer parsed. Published kits made this visible, but it reached every doc with an
    // example in it.
    const source = new Source(
        'start',
        `¶Try it out: \\Phrase('hi' 2m color: Color(60% 80 0°))\\¶\na: 1`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({});

    await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        false,
    );

    const sent = backend.asks.flatMap((ask) => ask.texts).join('\n');
    expect(sent).toContain(`Phrase('hi' 2m color: Color(60% 80 0°))`);
    expect(sent).not.toContain('2mcolor');
});

test('add mode leaves a name inside documentation alone', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A `\…\` example's own bindings are a quotation of code. Adding an alias to one per
    // locale tells a reader nothing and wraps a one-line example into a dozen; the name
    // still reads in the viewer's language, because the editor localizes a use site
    // through the definition it resolves to.
    const source = new Source(
        'start',
        `¶Like \\[1 2].translate(ƒ(each) each)\\¶\ncat: 1`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const backend = spy({ cat: 'gato', each: 'cada' });

    const result = await translateProjectContent(
        project,
        en,
        es,
        backend.translate,
        undefined,
        false,
    );

    const out = result?.getSources()[0].code.toString() ?? '';
    // The bind outside the doc still gains its translation.
    expect(out).toContain('gato');
    // The lambda parameter inside the doc does not.
    expect(out).not.toContain('cada');
});
