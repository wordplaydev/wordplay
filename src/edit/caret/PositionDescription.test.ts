import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** What a screen reader would be told about the caret at `position` in `code`. */
function describe(code: string, position: number): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
    return caret.getDescription(undefined, [], project.getContext(source));
}

/** The failure the templates fall back to when an input can't be resolved. */
const Unparsable = DefaultLocale.ui.template.unparsable.replace(
    '$template',
    '',
);

test.each([
    // The caret between a closing paren and a newline: there is no node after
    // it on the same line, so `$after` is undefined. Without a fallback branch
    // the whole template failed and a screen reader announced "Unparsable
    // template: between $before and $after" (found in VoiceOver testing).
    ['(1 + 2)\n3', 7],
    // Start of a line: no node before it on the line.
    ['1\n2', 2],
    // End of the source.
    ['1 + 2', 5],
    // Start of the source.
    ['1 + 2', 0],
])(
    'the caret at %o:%i is described without a template failure',
    (code, position) => {
        const description = describe(code, position);
        expect(description).not.toContain(Unparsable.trim());
        expect(description).not.toContain('$after');
        expect(description).not.toContain('$before');
        expect(description).not.toContain('undefined');
        expect(description.length).toBeGreaterThan(0);
    },
);

/** What a screen reader would be told about a selection in `code`. */
function describeRange(code: string, start: number, end: number): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, [start, end], undefined, undefined);
    return caret.getDescription(undefined, [], project.getContext(source));
}

test('a selection says how much is selected and what it says', () => {
    // Character offsets alone ("selection from 0 to 5") say nothing about
    // what was selected.
    const description = describeRange('1 + 2 + 3', 0, 5);
    expect(description).toContain('5');
    expect(description).toContain('1 + 2');
});

test('a long selection is previewed rather than read in full', () => {
    const code = 'x'.repeat(200);
    const description = describeRange(code, 0, 200);
    expect(description).toContain('200');
    expect(description).toContain('…');
    // The whole 200 characters are not read back.
    expect(description).not.toContain(code);
});

test('a selection description is direction-independent', () => {
    // Dragging right-to-left yields a reversed range; it describes the same
    // text and count.
    expect(describeRange('1 + 2 + 3', 5, 0)).toEqual(
        describeRange('1 + 2 + 3', 0, 5),
    );
});

test('an empty source still describes the caret', () => {
    const description = describe('', 0);
    expect(description).not.toContain('undefined');
    expect(description.length).toBeGreaterThan(0);
});
