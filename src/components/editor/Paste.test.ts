import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { pasteText } from './Paste';

/**
 * Paste `text` at `position` in `code` and return the resulting source. Mirrors how the editor pastes
 * (the single `pasteText` entry point), so it exercises the blocks-mode placeholder fill.
 */
function paste(code: string, position: number, text: string, blocks: boolean) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
    const result = pasteText(
        text,
        caret,
        project,
        blocks,
        project.getLocales(),
        undefined,
    );
    // A successful paste returns a revision tuple [source, caret].
    if (
        result === true ||
        typeof result === 'function' ||
        !Array.isArray(result)
    )
        return { code: undefined, placeholders: 0 };
    const newSource = result[0];
    if (!(newSource instanceof Source))
        return { code: undefined, placeholders: 0 };
    return {
        code: newSource.getCode().toString(),
        placeholders: newSource.expression.nodes(
            (n): n is ExpressionPlaceholder =>
                n instanceof ExpressionPlaceholder,
        ).length,
    };
}

test('pasting structure code in blocks mode fills its placeholders with defaults', () => {
    // Phrase's text input default is an empty text literal, so no placeholder remains.
    const { code, placeholders } = paste('[]', 1, 'Phrase(_)', true);
    expect(code).toBe("[Phrase('')]");
    expect(placeholders).toBe(0);
});

test('pasting in blocks mode resolves an ambiguous slot to the first autocomplete pick', () => {
    // ⬇ is Stack (the first concrete arrangement in basis order); content is an empty list.
    const { code, placeholders } = paste('[]', 1, 'Group(_ _)', true);
    expect(code).toBe('[Group(⬇() [])]');
    expect(placeholders).toBe(0);
});

test('pasting in text mode does not fill placeholders', () => {
    const { code } = paste('[]', 1, 'Phrase(_)', false);
    expect(code).toBe('[Phrase(_)]');
});

test('pasting only fills placeholders in the pasted region, not elsewhere', () => {
    // The leading top-level placeholder is outside the pasted region and must be preserved.
    const { code, placeholders } = paste('_\n[]', 3, 'Phrase(_)', true);
    expect(code).toBe("_\n[Phrase('')]");
    expect(placeholders).toBe(1);
});
