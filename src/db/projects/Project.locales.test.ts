import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Project from '@db/projects/Project';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import { buildKeywordIndex } from '@parser/Keywords';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';

/**
 * A project's declared languages say what its code is written in. They decide its basis —
 * which localized names bind and which words tokenize as keywords — so they must depend on
 * the project alone, never on who opened it (#1246).
 */

const es = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
) as LocaleText;

const zh = JSON.parse(
    readFileSync('static/locales/zh-CN/zh-CN.json', 'utf8'),
) as LocaleText;

/** A stand-in for LocalesDatabase that only ever serves the locales it was given, so a
 *  deserialize can't quietly pick up anything the project didn't declare. */
function fakeLocalesDB(available: LocaleText[], selected: LocaleText[]) {
    return {
        loadLocales: async (codes: string[]) =>
            codes
                .map((code) =>
                    available.find(
                        (l) =>
                            `${l.language}-${l.regions.join('-')}` === code ||
                            l.language === code,
                    ),
                )
                .filter((l): l is LocaleText => l !== undefined),
        getLocales: () => selected,
    };
}

function deserialize(
    project: Project,
    available: LocaleText[],
    selected: LocaleText[],
) {
    return Project.deserialize(
        // The fake only implements what deserialize uses.
        fakeLocalesDB(available, selected) as unknown as Parameters<
            typeof Project.deserialize
        >[0],
        project.serialize(),
    );
}

test('a project serializes exactly the locales it declares', () => {
    const project = Project.make(
        'p',
        'p',
        new Source('start', '1'),
        [],
        DefaultLocale,
    );
    // Not `getLocales().getLocales()`, which appends the en-US fallback and would have
    // grown the list by one on every save of a project that didn't declare English.
    expect(project.serialize().locales).toEqual(['en-US']);
    expect(project.withLocales([es]).serialize().locales).toEqual([
        'en-US',
        'es-MX',
    ]);
});

test('deserializing does not absorb the viewer’s selected locales', async () => {
    const english = Project.make(
        'p',
        'p',
        new Source('start', '1'),
        [],
        DefaultLocale,
    );

    // A viewer with Spanish and Chinese selected opens an English project.
    const opened = await deserialize(
        english,
        [DefaultLocale, es, zh],
        [es, zh],
    );

    expect(opened.getLocaleCodes()).toEqual(['en-US']);
    expect(opened.serialize().locales).toEqual(['en-US']);
});

test('a declared locale that fails to load stays declared', async () => {
    const project = Project.make(
        'p',
        'p',
        new Source('start', '1'),
        [],
        DefaultLocale,
    ).withLocales([es]);

    // Spanish is declared but unavailable this session (offline, 404, stale deploy).
    const opened = await deserialize(project, [DefaultLocale], []);

    expect(opened.getLocaleCodes()).toEqual(['en-US', 'es-MX']);
    expect(opened.getLocaleTexts().map((l) => l.language)).toEqual(['en']);
    // The next save must not drop it — that turned a failed fetch into data loss.
    expect(opened.serialize().locales).toEqual(['en-US', 'es-MX']);
    expect(opened.getLocaleUsage().unloaded).toEqual(['es-MX']);
});

test('adding a language leaves the primary one alone, and removing keeps at least one', () => {
    const project = Project.make(
        'p',
        'p',
        new Source('start', '1'),
        [],
        DefaultLocale,
    );

    const added = project.withLocales([es]);
    expect(added.getLocaleCodes()).toEqual(['en-US', 'es-MX']);
    // Adding twice is a no-op, and returns the same project so nothing re-analyzes.
    expect(added.withLocales([es])).toBe(added);

    const primary = added.withPrimaryLocale(es);
    expect(primary.getLocaleCodes()).toEqual(['es-MX', 'en-US']);
    expect(primary.getLocales().getLocale().language).toBe('es');

    expect(added.withoutLocales(['es-MX']).getLocaleCodes()).toEqual(['en-US']);
    // A project with no languages has no names at all, so the last one can't be removed.
    expect(
        added.withoutLocales(['en-US', 'es-MX']).getLocaleCodes(),
    ).toHaveLength(2);
});

test('a copy carries the declared codes, including ones that could not be loaded', async () => {
    const project = await deserialize(
        Project.make(
            'p',
            'p',
            new Source('start', '1'),
            [],
            DefaultLocale,
        ).withLocales([es]),
        [DefaultLocale],
        [],
    );

    expect(project.copy(null).getLocaleCodes()).toEqual(['en-US', 'es-MX']);
});

test('English names bind in a project that declares only another language', () => {
    // `Locales.getLocales()` appends the en-US fallback and the basis is built from that, so
    // English names always resolve. The generated name index leans on this — it drops from
    // every locale the names en-US binds at the same definition — so assert it rather than
    // trusting the trace.
    const source = new Source('start', 'Phrase("hola")');
    const spanishOnly = Project.make('p', 'p', source, [], [es]);
    const context = spanishOnly.getContext(source);

    const [phrase] = source.nodes(
        (n): n is Reference => n instanceof Reference,
    );
    expect(phrase.getName()).toBe('Phrase');
    expect(phrase.resolve(context)).toBeDefined();

    // A *third* locale's name is not carried along, which is what makes declaring it matter.
    const other = new Source('other', 'Fase("olá")');
    const withPortuguese = Project.make('p', 'p', other, [], [es]);
    const [fase] = other.nodes((n): n is Reference => n instanceof Reference);
    expect(fase.resolve(withPortuguese.getContext(other))).toBeUndefined();
});

test('a symbolic name only en-US declares still binds everywhere', () => {
    // The same fallback is why the locale files no longer repeat en-US's symbols:
    // `checkRedundantNames` took `💬` out of all 29 other locales, so this is the one thing
    // standing between that cleanup and every emoji name breaking outside English.
    const source = new Source('start', '💬("hola")');
    const spanishOnly = Project.make('p', 'p', source, [], [es]);
    const [phrase] = source.nodes(
        (n): n is Reference => n instanceof Reference,
    );
    const definition = phrase.resolve(spanishOnly.getContext(source));
    expect(definition).toBeDefined();

    // And it's still what a Spanish reader is *shown*: getPreferredName takes the first
    // symbolic name whatever language tagged it, so moving `💬` to en-US alone doesn't
    // demote it to the word.
    expect(definition?.names.getPreferredNameString([es])).toBe('💬');

    // And the operator names, which were the bulk of what came out.
    const math = new Source('math', '1 = 1');
    const mathProject = Project.make('p', 'p', math, [], [es]);
    expect(mathProject.getAnalysis().conflicts).toHaveLength(0);
});

test('a language named only by the code is used; one named nowhere is not', () => {
    const project = Project.make(
        'p',
        'p',
        // `Frase` is Spanish for `Phrase`; nothing here names Chinese.
        new Source('start', 'Frase("hola")'),
        [],
        [DefaultLocale, es, zh],
    );

    const usage = project.getLocaleUsage();
    expect(usage.used).toContain('es-MX');
    // English is first, so it's the project's own language and always counts as used, even
    // though nothing in the code names it.
    expect(usage.used).toContain('en-US');
    expect(usage.unused).toEqual(['zh-CN']);
});

test('a localized keyword counts as using its language', () => {
    // `función` only lexes as a function keyword while Spanish is declared; drop Spanish and
    // the *parse* changes, so this is a dependency `getLocalesUsed` alone cannot see.
    const code = 'f: función(x•#) x\nf(1)';
    const locales = [DefaultLocale, es];
    const project = Project.make(
        'p',
        'p',
        new Source(
            'start',
            code,
            buildKeywordIndex(locales.map((l) => l.keyword)),
        ),
        [],
        locales,
    );

    expect(project.getKeywordLocalesUsed()).toContain('es-MX');
    expect(project.getLocaleUsage().used).toContain('es-MX');

    // The same text without Spanish declared has no keyword tokens to find.
    const english = Project.make(
        'p',
        'p',
        new Source('start', code),
        [],
        DefaultLocale,
    );
    expect(english.getKeywordLocalesUsed().size).toBe(0);
});
