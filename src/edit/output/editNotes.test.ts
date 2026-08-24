import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import ListLiteral from '@nodes/ListLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import SetLiteral from '@nodes/SetLiteral';
import Source from '@nodes/Source';
import Unit from '@nodes/Unit';
import { Half, NoteDurations, Quarter } from '@output/Music/durations';
import readMusic, { musicsIn } from '@edit/output/editableMusic';
import ListLiteralNode from '@nodes/ListLiteral';
import Evaluate from '@nodes/Evaluate';
import type { NoteData } from '@output/Music/musicData';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';
import {
    bent,
    entryFor,
    chorded,
    isChord,
    unchorded,
    degreeText,
    inserted,
    moved,
    removed,
    replaced,
    transposed,
    withDegreeAt,
    withDuration,
} from '@edit/output/editNotes';

/** The note entries of the first track of a program. */
function entriesOf(code: string) {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const [evaluate] = musicsIn(project);
    const music = readMusic(project, evaluate);
    return { project, music, entries: music?.tracks[0].entries ?? [] };
}

test('a degree is written without floating-point noise', () => {
    expect(degreeText(1)).toBe('1');
    expect(degreeText(1.2)).toBe('1.2');
    // 0.1 + 0.1 + 1 is not exactly 1.2 in binary, and a creator should never
    // see the difference in their source.
    expect(degreeText(1 + 0.1 + 0.1)).toBe('1.2');
    expect(degreeText(-2.5)).toBe('-2.5');
});

test('transposing keeps the written form of what it moves', () => {
    const { entries } = entriesOf(`Music(Track([1 ø {1 3 5} 8𝅗𝅥]))`);
    const [bare, rest, chord, timed] = entries;

    // A bare number stays bare.
    const up = transposed(bare, 1);
    expect(up).toBeInstanceOf(NumberLiteral);
    expect(up.toWordplay()).toBe('2');

    // A rest has no degree to move, so silence stays silence.
    expect(transposed(rest, 3)).toBe(rest);

    // A chord stays one chord, every member moved together.
    const moved3 = transposed(chord, 2);
    expect(moved3).toBeInstanceOf(SetLiteral);
    expect(
        moved3 instanceof SetLiteral
            ? moved3.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['3', '5', '7']);

    // A note value written on the number survives being transposed — losing
    // it would silently change the rhythm.
    expect(transposed(timed, 1).toWordplay()).toBe(`9${Half}`);
});

test('a chord moves one voice at a time when asked', () => {
    const { entries } = entriesOf(`Music(Track([{1 3 5}]))`);
    const chord = withDegreeAt(entries[0], 1, (degree) => degree + 1);
    expect(
        chord instanceof SetLiteral
            ? chord.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['1', '4', '5']);
});

test('bending writes a fraction of a degree', () => {
    const { entries } = entriesOf(`Music(Track([1 {1 3}]))`);
    expect(bent(entries[0], 0, 0.2).toWordplay()).toBe('1.2');
    // Inside a chord, only the bent voice moves.
    const chord = bent(entries[1], 1, -0.5);
    expect(
        chord instanceof SetLiteral
            ? chord.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['1', '2.5']);
});

test('the duration picker rewrites a note value in place', () => {
    const { entries } = entriesOf(`Music(Track([1 {1 3 5} ø]))`);
    const [bare, chord, rest] = entries;

    expect(withDuration(bare, Unit.create([Half])).toWordplay()).toBe(
        `1${Half}`,
    );
    // A chord writes its length on its first member only.
    const timed = withDuration(chord, Unit.create([Quarter]));
    expect(
        timed instanceof SetLiteral
            ? timed.values.map((v) => v.toWordplay())
            : [],
    ).toEqual([`1${Quarter}`, '3', '5']);

    // A rest can't carry a value, so it is left alone rather than made invalid.
    expect(withDuration(rest, Unit.create([Half]))).toBe(rest);

    // And clearing the unit goes back to a bare number.
    expect(withDuration(entries[0], undefined).toWordplay()).toBe('1');
});

test('inserting places a note and appends past the end', () => {
    const { entries } = entriesOf(`Music(Track([1 2 3]))`);
    const at = (index: number) =>
        inserted(entries, index, 5, undefined).map((e) => e.toWordplay());
    expect(at(0)).toEqual(['5', '1', '2', '3']);
    expect(at(1)).toEqual(['1', '5', '2', '3']);
    expect(at(3)).toEqual(['1', '2', '3', '5']);
    // An index past the end appends rather than dropping the note.
    expect(at(99)).toEqual(['1', '2', '3', '5']);
    expect(at(-5)).toEqual(['5', '1', '2', '3']);
});

test('removing takes exactly one note, and nothing when out of range', () => {
    const { entries } = entriesOf(`Music(Track([1 2 3]))`);
    expect(removed(entries, 1).map((e) => e.toWordplay())).toEqual(['1', '3']);
    expect(removed(entries, 9).map((e) => e.toWordplay())).toEqual([
        '1',
        '2',
        '3',
    ]);
});

test('a note dragged past the end holds rather than wrapping', () => {
    // Wrapping would read as losing the note off one edge of the staff and
    // finding it at the other.
    const { entries } = entriesOf(`Music(Track([1 2 3]))`);
    expect(moved(entries, 0, 1).map((e) => e.toWordplay())).toEqual([
        '2',
        '1',
        '3',
    ]);
    expect(moved(entries, 0, -1).map((e) => e.toWordplay())).toEqual([
        '1',
        '2',
        '3',
    ]);
    expect(moved(entries, 2, 1).map((e) => e.toWordplay())).toEqual([
        '1',
        '2',
        '3',
    ]);
});

test('replacing swaps one entry and leaves its neighbours', () => {
    const { entries } = entriesOf(`Music(Track([1 2 3]))`);
    const next = replaced(entries, 1, NumberLiteral.make(9));
    expect(next.map((e) => e.toWordplay())).toEqual(['1', '9', '3']);
});

test('an edited list survives being written back into the source', () => {
    // The round trip that decides whether any of this is usable: the edited
    // nodes have to go through a real revise and come back as the same notes.
    // Serializing the detached list instead would prove nothing — spacing
    // lives in Source's Spaces map, so a bare toWordplay() writes `[1ø{135}]`
    // and `135` re-tokenizes as one number.
    const { project, music, entries } = entriesOf(
        `Music(Track([1 ø {1 3 5}]))`,
    );
    const list = music?.tracks[0].notes;
    if (list === undefined) throw new Error('expected a literal note list');

    const edited = inserted(
        replaced(entries, 0, transposed(entries[0], 2)),
        3,
        7,
        Unit.create([Half]),
    );
    const revised = project.withRevisedNodes([
        [list, ListLiteral.make(edited)],
    ]);

    const notes =
        readMusic(revised, musicsIn(revised)[0])?.tracks[0].data.notes ?? [];
    expect(notes.map((note) => note.degrees)).toEqual([
        [3],
        [],
        [1, 3, 5],
        [7],
    ]);
    // The inserted half note kept the length the picker gave it.
    expect(notes[3].beats).toBe(2);
});

test('a chord moves as a whole or one voice at a time', () => {
    // The two meanings the editor gives a chord: shift moves all of it,
    // plain moves the note you grabbed.
    const { entries } = entriesOf(`Music(Track([{1 3 5}]))`);
    const whole = transposed(entries[0], 2);
    expect(
        whole instanceof SetLiteral
            ? whole.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['3', '5', '7']);

    const one = withDegreeAt(entries[0], 2, (degree) => degree - 1);
    expect(
        one instanceof SetLiteral ? one.values.map((v) => v.toWordplay()) : [],
    ).toEqual(['1', '3', '4']);
});

test('a bend inside a chord leaves its siblings whole', () => {
    const { entries } = entriesOf(`Music(Track([{1 3 5}]))`);
    const bentOne = bent(entries[0], 1, 0.1);
    expect(
        bentOne instanceof SetLiteral
            ? bentOne.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['1', '3.1', '5']);
});

test('a chord keeps its length when one voice moves', () => {
    // The length lives on the first member, so moving it must not drop the
    // value and silently change the rhythm.
    const { entries } = entriesOf(`Music(Track([{1𝅗𝅥 3 5}]))`);
    const moved = withDegreeAt(entries[0], 0, (degree) => degree + 1);
    expect(
        moved instanceof SetLiteral
            ? moved.values.map((v) => v.toWordplay())
            : [],
    ).toEqual([`2${Half}`, '3', '5']);
});

test('the picker writes a quarter note as a bare number', () => {
    // A quarter is one beat and a bare number already means one beat, so
    // spelling it out would be noise in every note a creator places.
    const { entries } = entriesOf(`Music(Track([1𝅗𝅥]))`);
    expect(withDuration(entries[0], undefined).toWordplay()).toBe('1');
    expect(withDuration(entries[0], Unit.create([Quarter])).toWordplay()).toBe(
        `1${Quarter}`,
    );
});

test('a note becomes a chord a third above itself', () => {
    // A third rather than a second: the point of the button is to get a chord,
    // and adjacent degrees are the one interval that doesn't sound like one.
    const { entries } = entriesOf(`Music(Track([1 ø 3𝅗𝅥]))`);
    const [note, rest, timed] = entries;

    const chord = chorded(note);
    expect(isChord(chord)).toBe(true);
    expect(
        chord instanceof SetLiteral
            ? chord.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['1', '3']);

    // A rest has no pitch to build on.
    expect(chorded(rest)).toBe(rest);

    // And the length survives, so making a chord doesn't change the rhythm.
    const timedChord = chorded(timed);
    expect(
        timedChord instanceof SetLiteral
            ? timedChord.values.map((v) => v.toWordplay())
            : [],
    ).toEqual([`3${Half}`, '5']);
});

test('a chord grows from its top note', () => {
    const { entries } = entriesOf(`Music(Track([{1 3}]))`);
    const bigger = chorded(entries[0]);
    expect(
        bigger instanceof SetLiteral
            ? bigger.values.map((v) => v.toWordplay())
            : [],
    ).toEqual(['1', '3', '5']);
});

test('a chord reduces to its lowest note, keeping its length', () => {
    const { entries } = entriesOf(`Music(Track([{5𝅗𝅥 1 3} {1 3}]))`);
    // Lowest, not first: the note a creator hears as the chord's root.
    expect(unchorded(entries[0]).toWordplay()).toBe(`1${Half}`);
    expect(unchorded(entries[1]).toWordplay()).toBe('1');
    expect(isChord(unchorded(entries[0]))).toBe(false);
});

test('a single note is not a chord', () => {
    const { entries } = entriesOf(`Music(Track([1 ø]))`);
    expect(entries.map(isChord)).toEqual([false, false]);
});

/* ------------------------------------------------- transcribed entries */

/**
 * Build a music from transcribed notes and report what the project makes of
 * it.
 *
 * Conflicts rather than text, deliberately. The bug this covers wrote a unit
 * whose dimension name was the empty string; `Unit.toWordplay()` renders that
 * as nothing, so the entry printed exactly like a correct one and every
 * assertion on the emitted source passed while `Track` refused the list.
 */
function conflictsFor(notes: NoteData[]) {
    // Through `withRevisedNodes`, the way the palette commits, because that is
    // what gives the inserted nodes their spacing. Serializing a detached list
    // instead runs `3` and `5beats` together into `35beats`, which is a fact
    // about detached nodes rather than about what gets written.
    const project = Project.make(
        null,
        'test',
        new Source('test', 'Music(Track([1]))'),
        [],
        DefaultLocale,
    );
    const [evaluate] = musicsIn(project);
    const list = readMusic(project, evaluate)?.tracks[0].notes;
    if (list === undefined) throw new Error('no track to revise');

    const Note = project.shares.output.Note.getReference(
        new Locales(concretize, [DefaultLocale], DefaultLocale),
    );
    const entries = notes.map((note) => entryFor(note, Note));
    const revised = project.withRevisedNodes([
        [list, ListLiteralNode.make(entries)],
    ]);
    revised.analyze();
    return {
        code: revised.getMain().code.toString(),
        entries,
        conflicts: revised.analyze().conflicts.map((c) => c.constructor.name),
    };
}

test('every length a transcription can produce writes a legal entry', () => {
    // Whole-beat rounding readily produces 3 and 5, and of those only some
    // have a note value; the rest have to become a `Note`. Nothing may be
    // written with a fabricated unit.
    const lengths = [1, 2, 3, 4, 5, 6, 7, 8, 0.25, 0.375, 0.5, 0.75, 1.5, 2.5];
    for (const beats of lengths) {
        const { conflicts, code } = conflictsFor([
            { degrees: [3], beats, volume: 1 },
        ]);
        expect(conflicts, `${beats} beats wrote ${code}`).toEqual([]);
    }
});

test('no entry is written with a unit that names nothing', () => {
    // The precise defect: a dimension named '' is neither unitless nor a note
    // value, and it prints as nothing, so only the node reveals it.
    const { entries } = conflictsFor(
        [1, 2, 3, 5, 7].map((beats) => ({ degrees: [3], beats, volume: 1 })),
    );
    for (const entry of entries)
        for (const unit of entry.nodes((n): n is Unit => n instanceof Unit))
            for (const name of unit.exponents?.keys() ?? [])
                expect(name, `empty unit in ${entry.toWordplay()}`).not.toBe(
                    '',
                );
});

test('a rest keeps its length instead of collapsing to one beat', () => {
    // Every rest used to be written as a bare `ø`, which is one beat, so a
    // three-beat pause silently became a third of itself.
    const { entries, conflicts } = conflictsFor([
        { degrees: [], beats: 3, volume: 1 },
    ]);
    expect(conflicts).toEqual([]);
    expect(entries[0]).toBeInstanceOf(Evaluate);
    expect(entries[0].toWordplay()).toContain('3beats');
});

test('a length with a note value is written with its glyph, not as a Note', () => {
    // The readable form is still preferred wherever the notation has one.
    for (const duration of NoteDurations) {
        const { entries } = conflictsFor([
            { degrees: [3], beats: duration.beats, volume: 1 },
        ]);
        if (duration.beats === 1) continue;
        expect(entries[0].toWordplay(), `${duration.beats} beats`).toBe(
            `3${duration.unit}`,
        );
    }
});
