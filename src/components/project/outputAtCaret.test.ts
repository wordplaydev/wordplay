import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';
import outputAtCaret from '@components/project/outputAtCaret';

function setup(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return {
        project,
        at: (position: number) =>
            outputAtCaret(
                new Caret(source, position, undefined, undefined),
                project,
            ),
    };
}

describe('outputAtCaret', () => {
    test('finds the innermost output the caret is inside', () => {
        const code = "Stage([Phrase('hi')])";
        const { at } = setup(code);
        const found = at(code.indexOf("'hi'"));
        expect(found?.fun.toWordplay()).toBe('Phrase');
    });

    test('finds an enclosing output from anywhere inside it', () => {
        const code = "Stage([Phrase('hi')])";
        const { at } = setup(code);
        // On the Stage's own name, the Phrase is not an ancestor, so it's the Stage.
        expect(at(1)?.fun.toWordplay()).toBe('Stage');
    });

    test('finds nothing when the caret is not inside any output', () => {
        const code = "count: 1\nStage([Phrase('hi')])";
        const { at } = setup(code);
        expect(at(2)).toBeUndefined();
    });

    test('finds nothing from whitespace outside any output', () => {
        // The one-move dismissal lag lived here. A caret in space has no
        // space-excluding token, so `getExpressionAt()` returned undefined and the
        // palette bailed *without clearing* — the selection survived the move out of
        // the output and took a second move to drop. Resolution now goes through the
        // space-including token, which is defined here.
        const code = "Stage([Phrase('hi')])\n\ncount: 1";
        const { at } = setup(code);
        expect(at(code.indexOf('\n\n') + 1)).toBeUndefined();
    });

    test('the space before an output is outside it', () => {
        // `getToken` resolves through the token *following* the caret, so without a
        // position check a blank line above a Stage would select the Stage.
        const code = "count: 1\n\nStage([Phrase('hi')])";
        const { at } = setup(code);
        expect(at(code.indexOf('\n\n') + 1)).toBeUndefined();
    });

    test('the space before a nested output belongs to its parent', () => {
        // Skipping a candidate that starts after the caret must fall through to the
        // enclosing output, not give up: this position is outside the Phrase but
        // still well inside the Stage.
        const code = "Stage([  Phrase('hi')])";
        const { at } = setup(code);
        // Inside the space run, before Phrase's first token.
        expect(at(code.indexOf('  Phrase') + 1)?.fun.toWordplay()).toBe(
            'Stage',
        );
    });

    test('the caret immediately before an output is inside it', () => {
        // The boundary: sitting right against the first token is at the output, not
        // before it, so arrowing onto it selects rather than skipping past.
        const code = "Stage([  Phrase('hi')])";
        const { at } = setup(code);
        expect(at(code.indexOf('Phrase'))?.fun.toWordplay()).toBe('Phrase');
    });

    test('whitespace inside a multi-line output is interior to it', () => {
        // A creator editing a multi-line output sits in its indentation constantly;
        // the selection must not drop there.
        const code = "Stage(\n    [Phrase('hi')]\n)";
        const { at } = setup(code);
        expect(at(code.indexOf('\n    ') + 2)?.fun.toWordplay()).toBe('Stage');
    });
});
