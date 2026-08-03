import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { NoteDurations } from '@output/Music/durations';
import {
    FALSE_SYMBOL,
    FUNCTION_SYMBOL,
    NONE_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_DELIMITER_SYMBOL,
    QUOTIENT_SYMBOL,
    TRUE_SYMBOL,
} from '@parser/Symbols';
import UnicodeString from '@unicode/UnicodeString';
import { describe, expect, test } from 'vitest';
import Commands, { Category } from './Commands';
import { offeredInserts } from './offered';

const Inserts = Commands.filter((c) => c.category === Category.Insert);
const Half = '\u{1D157}\u{1D165}';

/** The row offered at a marked caret position, as symbols in order. */
function rowAt(marked: string): string[] {
    const mark = marked.indexOf('|');
    if (mark < 0) throw new Error('mark the caret with |');
    const code = marked.slice(0, mark) + marked.slice(mark + 1);
    // Caret positions count graphemes, not UTF-16 code units.
    const at = new UnicodeString(marked.slice(0, mark)).getLength();
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return offeredInserts(
        Inserts,
        project,
        new Caret(source, at, undefined, undefined),
    ).map((command) => command.symbol);
}

describe('what a note list offers', () => {
    const row = () => rowAt('Music(Track([1 2| 3]))');

    test('leads with the note values', () => {
        // They are the reason the row changed at all, so they come first
        // rather than at the end behind two dozen symbols that cannot go here.
        expect(row().slice(0, NoteDurations.length)).toEqual(
            NoteDurations.map((duration) => duration.unit),
        );
    });

    test('drops what a note can never be', () => {
        // A note list's items are numbers, rests, chords, or ♪ — so a boolean
        // is not merely unlikely there, it is rejected by the type.
        const symbols = row();
        expect(symbols).not.toContain(TRUE_SYMBOL);
        expect(symbols).not.toContain(FALSE_SYMBOL);
    });

    test('keeps a rest, which is a legal entry', () => {
        expect(row()).toContain(NONE_SYMBOL);
    });

    test('keeps symbols that make no claim about their type', () => {
        // An operator builds a larger expression rather than standing alone,
        // so nothing about it says it can't go here.
        expect(row()).toContain(QUOTIENT_SYMBOL);
        expect(row()).toContain(FUNCTION_SYMBOL);
    });
});

describe('what ordinary code offers', () => {
    test('keeps booleans where no field has an opinion', () => {
        const row = rowAt('x: |');
        expect(row).toContain(TRUE_SYMBOL);
        expect(row).toContain(FALSE_SYMBOL);
        expect(row).toContain(NONE_SYMBOL);
    });

    test('offers no note values away from a note', () => {
        const row = rowAt('x: 1|');
        for (const duration of NoteDurations)
            expect(row).not.toContain(duration.unit);
    });

    test('offers no pattern atoms outside a pattern', () => {
        expect(rowAt('x: |')).not.toContain(PATTERN_ANY_SYMBOL);
    });
});

describe('what a pattern offers', () => {
    test('offers the pattern atoms and nothing else', () => {
        const row = rowAt("'a' ⌕ ⣿◌|◌⣿");
        expect(row).toContain(PATTERN_ANY_SYMBOL);
        expect(row).toContain(PATTERN_DELIMITER_SYMBOL);
        expect(row).not.toContain(TRUE_SYMBOL);
        expect(row).not.toContain(FUNCTION_SYMBOL);
    });
});

test('a note value is offered in a ♪ as well as a bare entry', () => {
    expect(rowAt('Music(Track([♪(1| 2beats)]))')).toContain(Half);
});

test('with no caret, everything that lexes anywhere is offered', () => {
    const row = offeredInserts(Inserts, undefined, undefined).map(
        (command) => command.symbol,
    );
    expect(row).toContain(TRUE_SYMBOL);
    // Context-specific characters stay out until there's a reason for them.
    expect(row).not.toContain(PATTERN_ANY_SYMBOL);
    expect(row).not.toContain(Half);
});
