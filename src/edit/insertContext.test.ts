import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import UnicodeString from '@unicode/UnicodeString';
import { describe, expect, test } from 'vitest';
import { getInsertContext } from './insertContext';

/**
 * The context at a marked caret position. `|` marks where the caret sits and
 * is removed before parsing, so a test reads as the code a creator would see.
 */
function contextAt(marked: string) {
    const mark = marked.indexOf('|');
    if (mark < 0) throw new Error('mark the caret with |');
    const code = marked.slice(0, mark) + marked.slice(mark + 1);
    // Caret positions count graphemes, not UTF-16 code units — a note value is
    // two or three codepoints, so measuring the prefix the wrong way puts the
    // caret several characters early.
    const at = new UnicodeString(marked.slice(0, mark)).getLength();
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return getInsertContext(
        project,
        new Caret(source, at, undefined, undefined),
    );
}

const Half = '\u{1D157}\u{1D165}';

describe('pattern', () => {
    test.each([
        ['inside a pattern body', "'a' ⌕ ⣿|⣿", true],
        ['between pattern atoms', "'a' ⌕ ⣿◌|◌⣿", true],
        ['just outside the closing delimiter', "'a' ⌕ ⣿◌⣿|", false],
        ['in ordinary code', 'x: 1|', false],
        ['in a text literal', "'he|llo'", false],
    ])('%s', (_name, marked, expected) => {
        expect(contextAt(marked).pattern).toBe(expected);
    });
});

describe('unit', () => {
    test.each([
        ['right after a number', 'x: 1|', true],
        ['after a number in a list', 'Track([1 2| 3])', true],
        ['after a decimal', 'x: 1.5|', true],
        ['with a space between', 'x: 1 |', false],
        ['before the number', 'x: |1', false],
        ['inside the number', 'x: 12|3', false],
        ['after a name', 'x: hello|', false],
        ['after a close paren', 'x: (1)|', false],
        ['in an empty program', '|', false],
    ])('%s', (_name, marked, expected) => {
        expect(contextAt(marked).unit).toBe(expected);
    });
});

describe('noteList', () => {
    test.each([
        ['in a track note list', 'Music(Track([1 2| 3]))', true],
        ['in a named note list', 'Music(Track(notes: [1 2| 3]))', true],
        ['in a chord in a note list', 'Music(Track([{1 3| 5}]))', true],
        ['in a ♪ inside a note list', 'Music(Track([♪(1| 2beats)]))', true],
        ['in a bare ♪', '♪(1| 2beats)', true],
        // Every other input of a Track takes numbers too, and none of them
        // means a duration.
        ['in a track beat', 'Music(Track([1] beat: 2|beats))', false],
        ['in a track pan', 'Music(Track([1] pan: 0|))', false],
        ['in a track scale', 'Music(Track([1] scale: [0|semitones]))', false],
        ['in a music tempo', 'Music(Track([1]) tempo: 90|beats/min)', false],
        ['in another output type', "Phrase('hi' 2|m)", false],
        ['in a plain list', 'x: [1 2| 3]', false],
    ])('%s', (_name, marked, expected) => {
        expect(contextAt(marked).noteList).toBe(expected);
    });

    test('a note value is offered only where both hold', () => {
        // This is the conjunction the duration commands actually test, so it
        // is worth pinning: being in a note list is not enough on its own.
        const inList = contextAt('Music(Track([1 2| 3]))');
        expect(inList.unit && inList.noteList).toBe(true);
        const betweenNotes = contextAt('Music(Track([1 2 |3]))');
        expect(betweenNotes.noteList).toBe(true);
        expect(betweenNotes.unit && betweenNotes.noteList).toBe(false);
        const elsewhere = contextAt('x: 1|');
        expect(elsewhere.unit).toBe(true);
        expect(elsewhere.unit && elsewhere.noteList).toBe(false);
    });

    test('a note value already written still reads as a note list', () => {
        // Appending to an existing unit produces something the type rejects,
        // but the row staying put is better than it flickering away.
        expect(contextAt(`Music(Track([1 2${Half}|]))`).noteList).toBe(true);
    });
});

test('no caret means no opinion', () => {
    const source = new Source('test', 'x: 1');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = getInsertContext(project, undefined);
    expect(context).toEqual({ pattern: false, unit: false, noteList: false });
});
