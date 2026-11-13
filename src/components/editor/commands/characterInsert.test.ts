import { characterInsertion } from '#components/editor/commands/characterInsert.ts';
import Project from '#db/projects/Project.ts';
import Caret from '#edit/caret/Caret.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import Source from '#nodes/Source.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import { expect, test } from 'vitest';

const Reference = '@amy/cat';

/** The program after inserting the reference with the caret at `position`. */
function inserted(code: string, position: number | 'literal'): string {
    const source = new Source('t', code);
    const project = Project.make(null, 't', source, [], DefaultLocale);
    const literal = source
        .nodes()
        .find((n) => n instanceof TextLiteral || n instanceof FormattedLiteral);
    const caret = new Caret(
        source,
        position === 'literal' ? literal! : position,
        undefined,
        undefined,
    );
    const { target, payload } = characterInsertion(caret, Reference);
    const edit = target.insert(payload, false, project);
    const result = Array.isArray(edit) ? edit[0] : undefined;
    return result instanceof Source ? result.code.toString() : 'refused';
}

test.each([
    // The report: an emoji deleted from its quotes, then a character chosen.
    ['an emptied text keeps its quotes', "Phrase('')", 8, "Phrase('@amy/cat')"],
    [
        'text before the caret is kept',
        "Phrase('ab ')",
        11,
        "Phrase('ab @amy/cat')",
    ],
    [
        'a selected text is replaced by a text',
        "Phrase('ab'/en)",
        'literal',
        "Phrase('@amy/cat'/en)",
    ],
    [
        'a selected text keeps the quotes it was written with',
        'Phrase("ab")',
        'literal',
        'Phrase("@amy/cat")',
    ],
    [
        'formatted text takes it in place',
        'Phrase(`ab `)',
        11,
        'Phrase(`ab @amy/cat`)',
    ],
    ['code gets a formatted literal', 'Phrase()', 7, 'Phrase(`@amy/cat`)'],
] as const)('%s', (_, code, position, expected) => {
    expect(inserted(code, position)).toBe(expected);
});

test('a text holding a character has no conflicts in a text field', () => {
    const source = new Source('t', "•Page(scene•'')\nPage('@amy/cat')");
    const project = Project.make(null, 't', source, [], DefaultLocale);
    expect(
        Array.from(project.analyze().conflictedNodes.values()).flat(),
    ).toHaveLength(0);
});
