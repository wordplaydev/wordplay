import Project from '#db/projects/Project.ts';
import Caret from '#edit/caret/Caret.ts';
import type { Verbosity } from '#edit/describe/Verbosity.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import Token from '#nodes/Token.ts';
import { expect, test } from 'vitest';
import { toSpokenRuns } from '#locale/spokenLanguage.ts';

/** What a screen reader would be told about the caret at `position` in `code`. */
function describe(
    code: string,
    position: number,
    verbosity: Verbosity = 'normal',
): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
    return caret.getDescription(
        undefined,
        [],
        project.getContext(source),
        verbosity,
    );
}

/** What a screen reader would be told with the node matching `pick` selected. */
function describeNode(
    code: string,
    pick: (node: Token) => boolean,
    verbosity: Verbosity = 'normal',
): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const node = source
        .nodes()
        .find((node): node is Token => node instanceof Token && pick(node));
    if (node === undefined) throw new Error('no node matched');
    const caret = new Caret(source, node, undefined, undefined);
    return caret.getDescription(
        undefined,
        [],
        project.getContext(source),
        verbosity,
    );
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

test('a caret at the start of a token names the character after it', () => {
    // At a token's first character there is nothing before the caret, but the
    // first character is after it. A truthiness test on the offset said
    // "between start and end" instead, as if the token were empty.
    const description = describe('123 + 4', 0);
    expect(description).toContain('123');
    expect(description).not.toMatch(/start and end/);
    expect(description).toMatch(/and 1\b/);
});

test('terse says only where the caret is; normal adds the delimiter match', () => {
    const open = (token: Token) => token.getText() === '(';
    const terse = describeNode('(1 + 2)', open, 'terse');
    const normal = describeNode('(1 + 2)', open, 'normal');
    expect(normal.startsWith(terse)).toBe(true);
    expect(normal.length).toBeGreaterThan(terse.length);
    // The delimiter clause is what normal adds here.
    expect(normal).toContain(
        DefaultLocale.ui.edit.delimiterMatchedSameLine.split(' ')[0],
    );
    expect(terse).not.toContain(
        DefaultLocale.ui.edit.delimiterMatchedSameLine.split(' ')[0],
    );
});

test('verbose names the construct the selected node sits in', () => {
    const two = (token: Token) => token.getText() === '2';
    const normal = describeNode('[1 2 3]', two, 'normal');
    const verbose = describeNode('[1 2 3]', two, 'verbose');
    expect(verbose.startsWith(normal)).toBe(true);
    // The token's own node is the number, which "number 2" already names, so
    // the construct worth hearing is the list that holds it.
    expect(normal.toLowerCase()).not.toContain('list');
    expect(verbose.toLowerCase()).toContain('list');
});

test('verbose says nothing about the program as a parent', () => {
    // Every top-level statement's parent is the program, so naming it would
    // add the same words to every announcement.
    const one = (token: Token) => token.getText() === '1';
    expect(describeNode('1', one, 'verbose')).toEqual(
        describeNode('1', one, 'normal'),
    );
});

test('an empty source still describes the caret', () => {
    const description = describe('', 0);
    expect(description).not.toContain('undefined');
    expect(description.length).toBeGreaterThan(0);
});

test('a tagged literal’s words are marked with its language (#111)', () => {
    // Caret between the "o" and "l" of hola: the words and the characters
    // either side are Spanish, the sentence around them the reader's.
    const runs = toSpokenRuns(describe("'hola'/es", 3), 'en');
    expect(
        runs?.filter((run) => run.language === 'es').map((r) => r.text),
    ).toEqual(expect.arrayContaining(['hola']));
    expect(runs?.some((run) => run.language === 'en')).toBe(true);
});

test('an untagged literal needs no runs', () => {
    expect(toSpokenRuns(describe("'hola'", 3), 'en')).toBeUndefined();
});

test('a caret at the end of the source says what it comes after', () => {
    // The end token has no text, so "in end, between start and end" was said
    // at the end of every program, and never varied.
    const eleven = describe('11', 2);
    const one = describe('1', 1);
    expect(eleven).not.toMatch(/in end/i);
    expect(eleven).toContain('11');
    expect(eleven).not.toEqual(one);
});
