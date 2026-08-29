import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import { MaxTagCompletions } from '@locale/tagNames';
import Language from '@nodes/Language';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/**
 * Completing a locale tag as it's typed (#1220 follow-up).
 *
 * These assert through a *text caret*, which is the shape the editor actually
 * has and the shape that was broken: a tag's parts are tokens, `Sym.Name` is a
 * wildcard field kind, and so every field-driven path offered nothing. The
 * existing `Language` rows in PossibleEdits.test.ts select a token instead,
 * which reaches `getReplacementsForTokenAnchor` — the one path that always
 * worked — which is why they stayed green over a feature nobody could use.
 */

/** Every suggestion offered at a caret position, as source text. */
function suggestionsAt(code: string, position: number): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return getEditsAt(
        project,
        new Caret(source, position, undefined, undefined),
        undefined,
        DefaultLocales,
        undefined,
        [],
    )
        .map((revision) => revision.getNewNode(DefaultLocales)?.toWordplay())
        .filter((text): text is string => text !== undefined);
}

/** Just the locale tags among them. */
function tagsAt(code: string, position: number): string[] {
    return suggestionsAt(code, position).filter((text) => text.startsWith('/'));
}

describe('a caret beside a tag offers tags', () => {
    test.each([
        ["'hi'/", 5, '/en-US'],
        ["'hi'/en", 7, '/en-US'],
        ["'hi'/en-", 8, '/en-GB'],
        ["'hi'/en-U", 9, '/en-US'],
        ["'hi'/e", 6, '/es'],
        ["'hi'/esp", 8, '/español'],
        ["'hi'/span", 9, '/Spanish'],
        ["'hi'/es-méx", 11, '/es-México'],
    ])('%s at %i offers %s', (code, position, expected) => {
        expect(tagsAt(code, position)).toContain(expected);
    });

    test.each([
        ["'hi'/", 5],
        ["'hi'/en", 7],
        ["'hi'/en-", 8],
        ["'hi'/en-U", 9],
    ])('%s at %i offers a usable number of tags', (code, position) => {
        // The direct regression test: each of these offered exactly zero.
        const tags = tagsAt(code, position);
        expect(tags.length).toBeGreaterThan(0);
        // An empty tag is the one case that offers the whole shipped set; once
        // something is typed the list is capped so the menu stays readable.
        if (code !== "'hi'/")
            expect(tags.length).toBeLessThanOrEqual(MaxTagCompletions);
    });

    test('a region is offered before another language', () => {
        // Someone who typed `/en` wants `-US`; a multilingual tag is the rare
        // case, and used to fill the first 28 places.
        const tags = tagsAt("'hi'/en", 7);
        const region = tags.findIndex((tag) => tag.includes('-'));
        const multilingual = tags.findIndex((tag) => tag.includes('_'));
        expect(region).toBeGreaterThanOrEqual(0);
        if (multilingual >= 0) expect(region).toBeLessThan(multilingual);
    });

    test('a half-typed region is completed, not extended', () => {
        // `/en-U` used to offer only `/en_es-U` and friends, keeping the `U`.
        expect(
            tagsAt("'hi'/en-U", 9).filter((tag) => tag.includes('_')),
        ).toEqual([]);
    });

    test('every tag offered can be written as it is spelled', () => {
        // A suggestion has to survive retokenizing, or picking it produces
        // something else. `ø` and `ƒ` are letters that are also reserved
        // symbols, which is the way this can go wrong.
        for (const [code, position] of [
            ["'hi'/esp", 8],
            ["'hi'/e", 6],
            ["'hi'/en-U", 9],
            ["'hi'/cote", 9],
        ] as [string, number][])
            for (const tag of tagsAt(code, position)) {
                const written = new Source('test', `'hi'${tag}`);
                const language = written
                    .nodes()
                    .find((node) => node instanceof Language);
                expect(language?.toWordplay(), `${tag} did not survive`).toBe(
                    tag,
                );
            }
    });
});

describe('the blocks-mode empty tag slot', () => {
    test('offers tags rather than an empty menu', () => {
        // LanguageView renders the language field with `empty="menu"`, so blocks
        // mode shows a trigger here; its field kind is the wildcard `Sym.Name`,
        // so it used to offer nothing at all — and a tag can't be free-typed in
        // blocks mode, making the menu the only way in.
        const source = new Source('test', "'hi'/");
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const language = source
            .nodes()
            .find((node) => node instanceof Language);
        expect(language).toBeDefined();
        if (language === undefined) return;
        const tags = getEditsAt(
            project,
            new Caret(source, 5, undefined, undefined),
            { parent: language, field: 'language', index: undefined },
            DefaultLocales,
            undefined,
            [],
        )
            .map((revision) =>
                revision.getNewNode(DefaultLocales)?.toWordplay(),
            )
            .filter((text): text is string => text !== undefined);
        expect(tags).toContain('/en-US');
        expect(tags).toContain('/es-MX');
    });
});
