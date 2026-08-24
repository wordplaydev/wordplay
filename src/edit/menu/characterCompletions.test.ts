import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Replace from '@edit/revision/Replace';
import type Revision from '@edit/revision/Revision';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/**
 * Covers the custom-character autocomplete (#664): typing in markup or
 * formatted text offers each character the creator can reach, as a `@user/name`
 * link. The chain is long — Editor passes the names to getEditsAt, which puts
 * them on the EditContext, which ConceptLink, Markup, FormattedTranslation and
 * FormattedLiteral each read — and nothing exercised it end to end, so any link
 * in it could break without a test noticing.
 */

/** The characters a signed-in creator might have, in the order
 *  CharacterDatabase.getAvailableCharacterNamesForAutocomplete sorts them:
 *  owned, then collaborated, then other people's public ones. */
const Characters = ['me/Cat', 'me/Camel', 'friend/Dog', 'stranger/Cactus'];

/** The revisions offered at a caret position. */
function editsAt(code: string, position: number, characters = Characters) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return getEditsAt(
        project,
        new Caret(source, position, undefined, undefined),
        undefined,
        DefaultLocales,
        undefined,
        characters,
    );
}

/** What those revisions would produce, as source text. */
function textOf(revisions: Revision[]): string[] {
    return revisions
        .map((revision) => revision.getNewNode(DefaultLocales)?.toWordplay())
        .filter((text): text is string => text !== undefined);
}

/** Every suggestion offered at a caret position, as source text. */
function suggestionsAt(code: string, position: number): string[] {
    return textOf(editsAt(code, position));
}

describe('custom characters in the autocomplete menu', () => {
    test('a doc offers a link to every available character', () => {
        // Inside the doc's markup, right after the space.
        const code = '`hello `\n1';
        const suggestions = suggestionsAt(code, code.indexOf('`hello ') + 7);
        for (const character of Characters)
            expect(
                suggestions.some((s) => s.includes(`@${character}`)),
                `no suggestion for ${character} among ${suggestions.length}`,
            ).toBe(true);
    });

    test('replacing a partial link filters by prefix', () => {
        // `@me/Ca` matches both of this creator's characters and neither of the
        // others', which is what makes the menu usable once there are many.
        // Only the *replacements* narrow: the insertions offered alongside them
        // add something new after the link rather than completing it, so they
        // are no more filtered by the typed text than `*…*` is.
        const code = '`@me/Ca`\n1';
        const replacements = textOf(
            editsAt(code, code.indexOf('Ca') + 2).filter(
                (revision) => revision instanceof Replace,
            ),
        ).filter((s) => s.startsWith('@'));
        expect(replacements).toEqual(['@me/Cat', '@me/Camel']);
    });

    test('suggestions keep the order the database ranks them in', () => {
        // Owned before collaborated before other people's public characters.
        // The database does the ranking; the menu must not resort it, or the
        // creator's own characters sink below strangers'.
        const code = '`hello `\n1';
        const suggestions = suggestionsAt(code, code.indexOf('`hello ') + 7);
        const positions = Characters.map((character) =>
            suggestions.findIndex((s) => s.includes(`@${character}`)),
        );
        expect(positions.every((p) => p >= 0)).toBe(true);
        for (let i = 1; i < positions.length; i++)
            expect(
                positions[i],
                `${Characters[i]} is offered before ${Characters[i - 1]}`,
            ).toBeGreaterThan(positions[i - 1]);
    });

    test('no characters means no character suggestions', () => {
        // A signed-out creator has none; the menu must not offer an empty link.
        const code = '`hello `\n1';
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const suggestions = getEditsAt(
            project,
            new Caret(
                source,
                code.indexOf('`hello ') + 7,
                undefined,
                undefined,
            ),
            undefined,
            DefaultLocales,
        )
            .map((r) => r.getNewNode(DefaultLocales)?.toWordplay())
            .filter((t): t is string => t !== undefined);
        for (const character of Characters)
            expect(suggestions.some((s) => s.includes(`@${character}`))).toBe(
                false,
            );
    });
});
