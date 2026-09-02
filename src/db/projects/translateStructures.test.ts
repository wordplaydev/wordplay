import { Locales } from '@db/Database';
import Project from '@db/projects/Project';
import { stringToLocale } from '@locale/Locale';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import { parseSerializedProject } from '../../examples/examples';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';
import translateProjectContent, {
    type RawTranslator,
} from './translateProjectContent';

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');
const zh = stringToLocale('zh-CN');
const fr = stringToLocale('fr-FR');

/** Count every conflict in a project. */
function conflicts(project: Project): number {
    return Array.from(project.analyze().conflictedNodes.values()).flat().length;
}

/** A translator that renames each distinct string to a unique target-ish word,
 *  so a rename that fails to propagate shows up as an unresolved name. */
function renaming(): RawTranslator {
    let n = 0;
    const seen = new Map<string, string>();
    return async (texts) =>
        texts.map((text) => {
            const existing = seen.get(text);
            if (existing !== undefined) return existing;
            const translated =
                text.length < 25 && !text.includes(' ')
                    ? `nombre${n++}`
                    : `texto ${text.length}`;
            seen.set(text, translated);
            return translated;
        });
}

test('renaming a structure renames its type annotations too', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // `cat•Cat` names the structure just as a reference does, but a NameType
    // isn't a Reference — so it was left pointing at the old name, and every
    // value of that type then failed to resolve its properties.
    const source = new Source(
        'start',
        "•Cat(sound•'')\nƒ speak(cat•Cat) cat.sound\nspeak(Cat('meow'))",
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(conflicts(project)).toBe(0);

    const revised = await translateProjectContent(
        project,
        en,
        es,
        renaming(),
        undefined,
        true,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';
    // The annotation moved with the structure...
    expect(out).not.toContain('•Cat');
    // ...and nothing came loose.
    expect(conflicts(revised)).toBe(0);
});

// Deserializing and analyzing the largest example twice takes a few seconds
// under full-suite load; the default 5s timeout is not enough.
test('a translated name that collides with the target locale is disambiguated', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // The target locale brings its own basis into scope, and a model has no
    // idea what those words are: rendering `speed` as the same word the locale
    // uses for `Velocity` duplicates a definition the project can't see, which
    // conflicted the whole program and cost the creator the entire translation.
    const source = new Source('start', 'speed: 1m\nspeed');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const revised = await translateProjectContent(
        project,
        en,
        es,
        // `velocity` is a name the basis binds (Motion.velocity).
        async (texts) => texts.map(() => 'velocity'),
        DefaultLocale,
        true,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';
    // Suffixed rather than shadowing the definition already in scope.
    expect(out).toContain('velocity2');
    expect(conflicts(revised)).toBe(0);
});

// Deserializing and analyzing the largest example twice takes a few seconds
// under full-suite load; the default 5s timeout is not enough.
test('a whole example survives translation without new conflicts', async () => {
    if (en === undefined || zh === undefined) throw new Error('bad locale');

    // Heart Attack is the project that reported #1276: it has structures used
    // in type annotations, keys compared against the keyboard, and emoji
    // literals — every way translation had of breaking a program, in one file.
    // Conflict-free before and conflict-free after is the whole claim.
    const project = await Project.deserialize(
        Locales,
        parseSerializedProject(
            readFileSync('static/examples/HeartAttack.wp', 'utf8'),
            'heartattack',
        ),
    );
    expect(conflicts(project)).toBe(0);

    const revised = await translateProjectContent(
        project,
        en,
        zh,
        renaming(),
        undefined,
        false,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    expect(conflicts(revised)).toBe(0);

    const out = revised.getSources()[0]?.toWordplay() ?? '';
    // The keys the game compares against are data, not prose, so they stay.
    for (const key of ['ArrowLeft', 'ArrowRight', 'Space', 'Enter'])
        expect(out).toContain(`'${key}'`);
    // As do the emoji it draws with.
    expect(out).toContain('🫀');
}, 30_000);

test('adding a translation leaves the program alone and translates its prose', async () => {
    if (en === undefined || fr === undefined) throw new Error('bad locale');

    // The reported program (#seed-project-03), which has no binds of its own —
    // everything in it is standard library, so anything that changed came from
    // reference retargeting rather than from a translation.
    const source = new Source(
        'start',
        `¶A resting @Sequence animates forever without any input.¶
Stage([Phrase("⚽" size: 3m resting: Sequence.bounce(duration: 2s))])`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(conflicts(project)).toBe(0);

    const french = JSON.parse(
        readFileSync('static/locales/fr-FR/fr-FR.json', 'utf8'),
    );

    const revised = await translateProjectContent(
        project,
        en,
        fr,
        // French prose, with the ASCII apostrophe French prose actually has.
        // One of them, deliberately: two would balance as a text literal and
        // the guard would let it through by luck.
        async (texts) =>
            texts.map(() => "Une @Sequence au repos s'anime pour toujours."),
        french,
        false,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';

    // The prose is translated...
    expect(out).toContain("s'anime");
    // ...the program is untouched...
    expect(out).toContain('Stage(');
    expect(out).toContain('Phrase(');
    expect(out).toContain('Sequence.bounce');
    expect(out).not.toContain('💬');
    // ...the language is declared...
    expect(revised.getLocaleCodes()).toContain('fr-FR');
    // ...and nothing came loose.
    expect(conflicts(revised)).toBe(0);
}, 30_000);

test('adding a translation keeps an untagged name rather than replacing it', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A bind written without a language tag — which is how creators write them.
    const source = new Source('start', 'speed: 1m\nspeed');
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const revised = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => texts.map(() => 'rapidez'),
        undefined,
        false,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';

    // Both names are there — the creator's word wasn't deleted to make room.
    expect(out).toContain('speed');
    expect(out).toContain('rapidez');
    // And the reference still resolves, without having been rewritten.
    expect(conflicts(revised)).toBe(0);
});

test('rewriting in another language renames input names too', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A rewritten program has to be rewritten all the way. `size:` names the
    // same bind the function does, so leaving it behind produced code that was
    // in neither language.
    const source = new Source('start', "Phrase('hi' size: 3m)");
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const spanish = JSON.parse(
        readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
    );

    const revised = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => texts.map((t) => `«${t}»`),
        spanish,
        true,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';

    // The input name moved with the function it belongs to.
    expect(out).not.toContain('size:');
    expect(conflicts(revised)).toBe(0);
});

test('rewriting renames an input whose value holds more inputs', async () => {
    if (en === undefined || fr === undefined) throw new Error('bad locale');

    // `resting:` contains the evaluation that owns `duration:`. Replacing the
    // inner one first rebuilds the outer one's ancestors, so its replacement was
    // silently dropped and the program came back part French, part English.
    const source = new Source(
        'start',
        'Phrase("⚽" size: 3m resting: Sequence.bounce(duration: 2s))',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const french = JSON.parse(
        readFileSync('static/locales/fr-FR/fr-FR.json', 'utf8'),
    );

    const revised = await translateProjectContent(
        project,
        en,
        fr,
        async (texts) => texts.map((t) => `«${t}»`),
        french,
        true,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';
    for (const english of ['size:', 'resting:', 'duration:'])
        expect(out).not.toContain(english);
    expect(conflicts(revised)).toBe(0);
});

test('rewriting leaves only the target language, even where it already existed', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // Already multilingual: two docs and two names. Rewriting reduced the bind
    // to its Spanish name but kept both docs, because the text pass treated
    // "already translated" as "nothing to do" instead of "reduce to this one".
    const source = new Source(
        'start',
        '¶hi¶/en¶hola¶/es\ncat/en,gato/es: 1\ncat',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const revised = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => texts.map((t) => `«${t}»`),
        undefined,
        true,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';

    // Only the Spanish doc and name survive...
    expect(out).toContain('hola');
    expect(out).not.toContain('hi');
    expect(out).toContain('gato');
    expect(out).not.toContain('cat');
    // ...and neither carries a language tag any more, like everything else
    // rewrite mode produces.
    expect(out).not.toContain('/es');
    expect(conflicts(revised)).toBe(0);
});

test('adding a translation to already-multilingual content keeps both', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // The other half of the same behavior: add mode must not reduce anything.
    const source = new Source(
        'start',
        '¶hi¶/en¶hola¶/es\ncat/en,gato/es: 1\ncat',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const revised = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => texts.map((t) => `«${t}»`),
        undefined,
        false,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';
    for (const kept of ['hi', 'hola', 'cat', 'gato'])
        expect(out).toContain(kept);
});

test('reducing to one language keeps an interpolation intact', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');

    // A text literal whose segments aren't all plain text: the `\name\` is an
    // expression, so reading the option out as a string and rebuilding from it
    // would lose it. Reduction rebuilds from the option's own segments.
    const source = new Source(
        'start',
        "name: 'world'\n'hi \\name\\'/en'hola \\name\\'/es",
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(conflicts(project)).toBe(0);

    const revised = await translateProjectContent(
        project,
        en,
        es,
        async (texts) => texts.map((t) => `«${t}»`),
        undefined,
        true,
    );

    expect(revised).not.toBeNull();
    if (revised === null) return;
    const out = revised.getSources()[0]?.toWordplay() ?? '';

    // The Spanish option survives with its interpolation, and the English is
    // gone. The interpolation is checked by conflict count rather than by text:
    // the re-spacing pass puts a line break inside `\…\` regardless of mode,
    // but a reference that stopped resolving would be an UnknownName.
    expect(out).toContain('hola');
    expect(out).not.toContain('hi ');
    expect(out).toContain('name');
    expect(conflicts(revised)).toBe(0);
});

// The Key stream reports a well-known key as the PRIMARY locale's display name
// (localizeKeyName), so a rewritten program must compare against the target
// locale's key names — the #1276-style protection that keeps such strings
// untranslated by the model is not enough on its own. The mapping comes from
// the stream's own table, so it is deterministic.
test('rewriting maps compared key names to the target locale, deterministically', async () => {
    if (en === undefined) throw new Error('bad locale');
    const esMX = stringToLocale('es-MX');
    if (esMX === undefined) throw new Error('bad locale');
    const esMXText = JSON.parse(
        readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
    );

    const source = new Source(
        'start',
        `key: Key()\nstarted: key = "Space"\nletters: ['a' 'b'].join(' ')`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const result = await translateProjectContent(
        project,
        en,
        esMX,
        async (texts) => texts.map((t) => `X${t}`),
        esMXText,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].code.toString() ?? '';
    // The compared key follows the locale's key table...
    expect(out).toContain(`'Espacio'`);
    expect(out).not.toContain('"Space"');
    // ...while a letterless separator literal is left alone.
    expect(out).toContain(`(' ')`);
});

// A translated name must never land on a word the target locale uses for a
// keyword: `withKeywordedSources()` re-lexes the source, so a bind named with
// the word for `true` re-parses as the literal ⊤ — which is why every locale
// whose word for "correct" is its word for "true" refused FrenchNumbers, and
// why the rewritten game would have scored every guess (#1310).
test('a translated name never lands on a keyword word', async () => {
    if (en === undefined) throw new Error('bad locale');
    const tr = stringToLocale('tr-TR');
    if (tr === undefined) throw new Error('bad locale');
    const trText = JSON.parse(
        readFileSync('static/locales/tr-TR/tr-TR.json', 'utf8'),
    );

    const source = new Source(
        'start',
        'correct: 1 = 1\npoints: correct ? 1 0\npoints',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    // `doğru` is Turkish for "correct" — and tr-TR's word for `true`.
    const result = await translateProjectContent(
        project,
        en,
        tr,
        async (texts) =>
            texts.map((t) => (t === 'correct' ? 'doğru' : `x${t}`)),
        trText,
        true,
        { preserveTagged: true, validate: true },
    );

    expect(result).not.toBeNull();
    const out = result?.getSources()[0].code.toString() ?? '';
    // Disambiguated rather than refused, and the conditional still reads the
    // bind rather than a boolean literal.
    expect(out).toContain('doğru2');
    expect(conflicts(result as Project)).toBe(0);
});

// Retargeting a reference must not respell it into something that means
// something else here: ja-JP calls `Time` 時間, and Size.wp's own bind carries
// 時間 as a tagged name, so the rewritten reference resolved to the bind and
// the bind referenced itself (#1310).
test('retargeting never captures a reference with an enclosing name', async () => {
    if (en === undefined) throw new Error('bad locale');
    const ja = stringToLocale('ja-JP');
    if (ja === undefined) throw new Error('bad locale');
    const jaText = JSON.parse(
        readFileSync('static/locales/ja-JP/ja-JP.json', 'utf8'),
    );

    // The bind's own tagged name is the locale's word for the Time stream.
    const source = new Source(
        'start',
        'time/en,時間/zh: ((Time(1234ms)) ÷ 1ms) × 1°\nPhrase(time → "")',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const before = conflicts(project.withPrimaryLocale(jaText));
    const result = await translateProjectContent(
        project,
        en,
        ja,
        async (texts) => texts,
        jaText,
        true,
        { preserveTagged: true },
    );

    expect(result).not.toBeNull();
    // The reference keeps its source spelling rather than becoming 時間,
    // which would have resolved to the bind itself.
    expect(conflicts(result as Project)).toBeLessThanOrEqual(before);
});
