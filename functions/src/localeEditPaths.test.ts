import { describe, expect, test } from 'vitest';
import { isRecord } from './shared/guards.js';
import {
    LocaleSections,
    isListEditPath,
    listDisplay,
    localeSectionPath,
    mergeSections,
    parseOverrideKey,
    sectionFileFor,
    setAtPath,
    sliceForSection,
} from './localeEditPaths.js';

/** A locale file the size of the cases: one glossary term with no forms yet,
 *  one with some, and a positional tuple. A type alias rather than an interface,
 *  so it satisfies the `Record<string, unknown>` the writer takes. */
type LocaleFile = {
    glossary: Record<
        string,
        { word: string; definition: string; forms?: string[] }
    >;
    ui: { page: { localize: { tabs: { labels: string[] } } } };
};

function locale(): LocaleFile {
    return {
        glossary: {
            parameter: { word: 'paramètre', definition: 'une valeur' },
            value: {
                word: 'valeur',
                definition: 'une chose',
                forms: ['valeurs'],
            },
        },
        ui: { page: { localize: { tabs: { labels: ['A', 'B', 'C', 'D'] } } } },
    };
}

test('an override key parses into a path and an optional index', () => {
    // The workspace has its own copy of this parser, since the two packages
    // can't share a module; `overrideKey.test.ts` on that side runs both
    // against one table, so a drift fails a test rather than a submission.
    expect(parseOverrideKey('ui.localize.button.edit')).toEqual({
        path: 'ui.localize.button.edit',
        index: undefined,
    });
    expect(parseOverrideKey('ui.page.localize.tabs.labels.0')).toEqual({
        path: 'ui.page.localize.tabs.labels',
        index: 0,
    });
    // A whole-list key has no tail, since the list is edited as one thing.
    expect(parseOverrideKey('glossary.parameter.forms')).toEqual({
        path: 'glossary.parameter.forms',
        index: undefined,
    });
});

test('only a glossary term’s forms may be replaced as a whole list', () => {
    expect(isListEditPath('glossary.parameter.forms')).toBe(true);
    expect(isListEditPath('glossary.sideEffect.forms')).toBe(true);
    expect(isListEditPath('glossary.parameter.word')).toBe(false);
    expect(isListEditPath('ui.page.localize.tabs.labels')).toBe(false);
    expect(isListEditPath('terms.forms')).toBe(false);
});

test('a list creates the forms key a locale has never had', () => {
    const json = locale();
    setAtPath(json, 'glossary.parameter.forms', undefined, ['paramètres']);
    expect(json.glossary.parameter!.forms).toEqual(['paramètres']);
});

test('an empty list removes the key, as the verifier’s own repair would', () => {
    const json = locale();
    setAtPath(json, 'glossary.value.forms', undefined, []);
    expect('forms' in json.glossary.value!).toBe(false);
});

test('entries are trimmed on the way in', () => {
    const json = locale();
    setAtPath(json, 'glossary.parameter.forms', undefined, [' paramètres ']);
    expect(json.glossary.parameter!.forms).toEqual(['paramètres']);
});

test('a list is refused anywhere a locale does not own the list', () => {
    // Without this, any signed-in caller could shrink a positional tuple whose
    // length has to match en-US.
    expect(() =>
        setAtPath(locale(), 'ui.page.localize.tabs.labels', undefined, ['A']),
    ).toThrow();
    expect(() =>
        setAtPath(locale(), 'glossary.parameter.word', undefined, ['x']),
    ).toThrow();
});

test('a list and an index are mutually exclusive', () => {
    expect(() =>
        setAtPath(locale(), 'glossary.value.forms', 0, ['valeurs']),
    ).toThrow();
});

test('a list a locale should never contain is refused', () => {
    const bad: string[][] = [
        [''],
        ['   '],
        ['$?valeurs'],
        ['valeurs', 'Valeurs'],
        // What a client could actually put on the wire, so parsed rather than
        // cast: an entry that isn't a string at all.
        JSON.parse('[42]'),
        ['x'.repeat(101)],
        new Array(51).fill(0).map((_, index) => `f${index}`),
    ];
    for (const value of bad)
        expect(() =>
            setAtPath(locale(), 'glossary.parameter.forms', undefined, value),
        ).toThrow();
});

test('a term the locale does not have is refused rather than created', () => {
    expect(() =>
        setAtPath(locale(), 'glossary.nonesuch.forms', undefined, ['x']),
    ).toThrow();
});

test('a string edit still behaves exactly as before', () => {
    const json = locale();
    setAtPath(json, 'glossary.parameter.word', undefined, 'paramètre!');
    expect(json.glossary.parameter!.word).toBe('paramètre!');
    setAtPath(json, 'ui.page.localize.tabs.labels', 1, 'Texte');
    expect(json.ui.page.localize.tabs.labels[1]).toBe('Texte');
    // Out of bounds still fails the whole bundle, so an appended element can't
    // land silently in the wrong place.
    expect(() =>
        setAtPath(json, 'ui.page.localize.tabs.labels', 9, 'x'),
    ).toThrow();
});

test('a list reads as words in the pull request table', () => {
    expect(listDisplay(['valeurs', 'valeur'])).toBe('valeurs, valeur');
    expect(listDisplay(undefined)).toBe('');
});

describe('locale section routing', () => {
    // Mirrors src/util/verify-locales/localeFiles.test.ts. `functions/` compiles
    // with its own rootDir and cannot import that module, so the rule lives in
    // two places and these cases hold them together.
    test.each<[string, string]>([
        ['ui.page.login.header', 'ui-page.json'],
        ['ui.dialog.share.header', 'ui.json'],
        ['node.Program.name', 'node.json'],
        ['basis.List.function.add.names', 'basis.json'],
        ['input.Key.keys.0', 'input.json'],
        ['output.Phrase.names', 'output.json'],
        ['token.EvalOpen', 'token-keyword.json'],
        ['keyword.and', 'token-keyword.json'],
        ['glossary.value.forms', 'locale.json'],
        ['moderation.progress', 'locale.json'],
    ])('%s routes to %s', (path, section) => {
        expect(sectionFileFor(path)).toBe(section);
    });

    test('a section path knows where en-US lives', () => {
        expect(localeSectionPath('es-MX', 'ui.json')).toBe(
            'static/locales/es-MX/sections/ui.json',
        );
        expect(localeSectionPath('en-US', 'ui.json')).toBe(
            'src/locale/en-US/sections/ui.json',
        );
    });

    test('slicing an assembled locale gives back what each section holds', () => {
        const assembled: Record<string, unknown> = {
            $schema: 'ignored',
            language: 'es',
            glossary: { value: { word: 'valor' } },
            node: { Program: { name: 'programa' } },
            ui: { page: { login: { header: 'entrar' } }, dialog: { a: 'b' } },
        };

        expect(sliceForSection(assembled, 'locale.json')).toEqual({
            language: 'es',
            glossary: { value: { word: 'valor' } },
        });
        expect(sliceForSection(assembled, 'node.json')).toEqual({
            node: { Program: { name: 'programa' } },
        });
        // `ui` is the one key split across two files, and each gets only its half.
        expect(sliceForSection(assembled, 'ui-page.json')).toEqual({
            ui: { page: { login: { header: 'entrar' } } },
        });
        expect(sliceForSection(assembled, 'ui.json')).toEqual({
            ui: { dialog: { a: 'b' } },
        });
        // A section this locale has nothing for is empty, never invented.
        expect(sliceForSection(assembled, 'basis.json')).toEqual({});
    });

    test('every section is reachable, so no edit can be stranded', () => {
        const reached = new Set(
            [
                'language',
                'ui.dialog.x',
                'ui.page.x',
                'node.x',
                'basis.x',
                'input.x',
                'output.x',
                'token.x',
            ].map((path) => sectionFileFor(path)),
        );
        expect([...reached].sort()).toEqual([...LocaleSections].sort());
    });
});

describe('a submission round trip through sections', () => {
    // The shape `submitLocalization` actually performs: fetch the sections an
    // edit touches, merge them, apply the edit, slice back. The merge is the
    // half that is easy to get wrong, because `ui` arrives in two files.
    const fetched = [
        {
            json: {
                $schema: 'x',
                language: 'es',
                glossary: { v: { word: 'valor' } },
            },
        },
        { json: { $schema: 'x', ui: { dialog: { save: 'guardar' } } } },
        {
            json: {
                $schema: 'x',
                ui: { page: { login: { header: 'entrar' } } },
            },
        },
    ];

    test('merging keeps both halves of ui', () => {
        const merged = mergeSections(fetched);
        const ui = merged['ui'];
        expect(isRecord(ui) ? Object.keys(ui).sort() : []).toEqual([
            'dialog',
            'page',
        ]);
        // Each section carries its own $schema, and the merged document has none.
        expect(merged['$schema']).toBeUndefined();
    });

    test('an edit to one half does not drop the other', () => {
        const merged = mergeSections(fetched);
        setAtPath(merged, 'ui.page.login.header', undefined, 'iniciar sesión');

        expect(sliceForSection(merged, 'ui-page.json')).toEqual({
            ui: { page: { login: { header: 'iniciar sesión' } } },
        });
        // The untouched half survives, which a replace-instead-of-merge would
        // have silently destroyed.
        expect(sliceForSection(merged, 'ui.json')).toEqual({
            ui: { dialog: { save: 'guardar' } },
        });
        expect(sliceForSection(merged, 'locale.json')).toEqual({
            language: 'es',
            glossary: { v: { word: 'valor' } },
        });
    });

    test('the section keeps its $schema, so a translator keeps validation', () => {
        // The merged document has no $schema — each section carries its own —
        // so a slice written without it silently drops the reference and the
        // file still parses. The editor just stops checking anything.
        const merged = mergeSections(fetched);
        const written = sliceForSection(
            merged,
            'ui-page.json',
            '../../../static/schemas/sections/ui-page.json',
        );
        expect(written['$schema']).toBe(
            '../../../static/schemas/sections/ui-page.json',
        );
        // And it comes first, as it does in every locale file on disk.
        expect(Object.keys(written)[0]).toBe('$schema');
    });

    test('nothing is written for a section that was never fetched', () => {
        expect(sliceForSection(mergeSections(fetched), 'node.json')).toEqual(
            {},
        );
    });
});
