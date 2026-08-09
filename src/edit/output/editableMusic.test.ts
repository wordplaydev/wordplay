import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import ListLiteral from '@nodes/ListLiteral';
import NumberLiteral from '@nodes/NumberLiteral';
import SetLiteral from '@nodes/SetLiteral';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import { NameGenerator } from '@output/Output/Stage';
import { toMusic } from '@output/Music/Music';
import evaluateCode from '@runtime/evaluate';
import readMusic, {
    isEditable,
    musicSignature,
    musicsIn,
} from '@edit/output/editableMusic';
import { Scales } from '@output/Music/scales';
import { inserted } from '@edit/output/editNotes';

function projectFrom(code: string) {
    return Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
}

/** The editor's reading of the first music in a program. */
function read(code: string) {
    const project = projectFrom(code);
    const [music] = musicsIn(project);
    expect(music).toBeInstanceOf(Evaluate);
    return readMusic(project, music);
}

/** What the runtime itself produces, for comparison. */
function runtime(code: string) {
    const value = evaluateCode(code);
    const project = projectFrom(code);
    return value
        ? toMusic(project, value, new NameGenerator())?.toData()
        : undefined;
}

test('reading from source agrees with what the runtime plays', () => {
    // The whole point of reading from source: the sheet must draw the same
    // notes the player sounds. Anything these disagree on is a bug a creator
    // would see as the editor lying about their music.
    for (const code of [
        `Music(Track([1 2 3 4]))`,
        `Music(Track([1 ø {1 3 5} 8]))`,
        `Music(Track([1 2 3] instrument: Instrument.drums beat: 0.5beats))`,
        `Music(Track([1 2]) tempo: 90beats/min key: 3semitones scale: Music.minor)`,
        `Music([Track([1 2]) Track([3 4] instrument: Instrument.flute pan: -1)])`,
        `Music(Track([1𝅗𝅥 2𝅘𝅥𝅮 3]))`,
        `Music(Track([1 2] volume: 50% loop: ⊥ mash: ⊥))`,
        `Music(Track([♪(1 2beats 50%) 3]))`,
        `Music(Track([1 2]) name: 'tune')`,
    ]) {
        const fromSource = read(code)?.data;
        const fromRuntime = runtime(code);
        expect(fromRuntime, code).toBeDefined();
        // The name is the one field that legitimately differs: the runtime
        // falls back to a generated stage name, which source can't know.
        expect({ ...fromSource, name: '' }, code).toEqual({
            ...fromRuntime,
            name: '',
        });
    }
});

test('every note carries the source node it came from', () => {
    const music = read(`Music(Track([1 ø {1 3 5} 8]))`);
    const [track] = music?.tracks ?? [];
    expect(track.entries).toHaveLength(4);
    expect(track.data.notes).toHaveLength(4);
    // The third entry is the chord, and its node is the set that wrote it.
    // Checked structurally rather than by toWordplay(), which renders a
    // detached subtree without its spacing — that lives in Source's Spaces
    // map, keyed by token, so `{1 3 5}` comes back as `{135}`.
    expect(track.entries[2]).toBeInstanceOf(SetLiteral);
    expect(track.data.notes[2].degrees).toEqual([1, 3, 5]);
    // The first is a plain number, editable by replacing that one literal.
    expect(track.entries[0]).toBeInstanceOf(NumberLiteral);
});

test('a computed note list draws but cannot be edited', () => {
    // The read-only case, and the reason `notes` is optional: there is no node
    // per note to replace, so a click has nowhere to write.
    const music = read(
        `cell: [1 3 5 3]\nMusic(Track(cell.append(cell.reverse())))`,
    );
    const [track] = music?.tracks ?? [];
    expect(track).toBeDefined();
    expect(isEditable(track)).toBe(false);
    expect(track.entries).toHaveLength(0);
});

test('a spread makes its whole list read-only', () => {
    // A spread has no note of its own to replace, so the entries would no
    // longer line up with what is drawn.
    const music = read(
        `tune: [1 2 3]\nrest: [ø ø]\nMusic(Track([:tune :rest]))`,
    );
    const [track] = music?.tracks ?? [];
    expect(isEditable(track)).toBe(false);
});

test('a literal list is editable', () => {
    const [track] = read(`Music(Track([1 2 3]))`)?.tracks ?? [];
    expect(isEditable(track)).toBe(true);
});

test('a track defers to the music for scale and key unless it overrides', () => {
    const music = read(
        `Music([Track([1]) Track([1] scale: Music.pentatonic key: 5semitones)] scale: Music.minor key: 2semitones)`,
    );
    const [inherits, overrides] = music?.tracks ?? [];
    expect(inherits.data.scale).toEqual(Scales.minor);
    expect(inherits.data.key).toBe(2);
    expect(overrides.data.scale).toEqual(Scales.pentatonic);
    expect(overrides.data.key).toBe(5);
});

test('a lone track needn’t be wrapped in a list', () => {
    // `tracks` is `[🎶]|🎶`, so both spellings must read the same.
    expect(read(`Music(Track([1 2]))`)?.tracks).toHaveLength(1);
    expect(read(`Music([Track([1 2])])`)?.tracks).toHaveLength(1);
});

test('reading a non-music expression yields nothing', () => {
    const project = projectFrom(`Phrase('hi')`);
    const [evaluate] = project
        .getMain()
        .nodes()
        .filter((node): node is Evaluate => node instanceof Evaluate);
    expect(readMusic(project, evaluate)).toBeUndefined();
});

test('every music in a project is found, in order', () => {
    const project = projectFrom(
        `Stage([Music(Track([1]) name: 'a') Music(Track([2]) name: 'b')])`,
    );
    const musics = musicsIn(project);
    expect(musics).toHaveLength(2);
    expect(musics.map((m) => readMusic(project, m)?.data.name)).toEqual([
        'a',
        'b',
    ]);
});

test('a revise keeps the identity of the notes it did not touch', () => {
    // What makes the editor able to animate an insertion: the notes that
    // shifted are the same nodes they were, so the view can key on them and
    // slide them rather than replacing every note after the new one.
    const project = projectFrom(`Music(Track([1 2 3]))`);
    const music = readMusic(project, musicsIn(project)[0]);
    const before = music?.tracks[0].entries.map((entry) => entry.id) ?? [];
    const list = music?.tracks[0].notes;
    if (list === undefined) throw new Error('expected a literal note list');

    const revised = project.withRevisedNodes([
        [
            list,
            ListLiteral.make(
                inserted(music?.tracks[0].entries ?? [], 0, 9, undefined),
            ),
        ],
    ]);
    const after =
        readMusic(revised, musicsIn(revised)[0])?.tracks[0].entries.map(
            (entry) => entry.id,
        ) ?? [];

    expect(after).toHaveLength(before.length + 1);
    // Each original note kept its id, one place later.
    expect(after.slice(1)).toEqual(before);
    // And the inserted one is genuinely new.
    expect(before).not.toContain(after[0]);
});

test('a track named elsewhere is still found and editable', () => {
    // How a MIDI import writes itself, and how anyone organizing a long piece
    // would: the tracks are bound to names and the music refers to them.
    // Reading only inline Track(…) expressions found no tracks at all, so the
    // editor showed a music with nothing in it.
    const music = read(
        `melody: Track([1 2 3])\nbass: Track([1 5] instrument: Instrument.synthBass)\nMusic([melody bass])`,
    );
    expect(music?.tracks).toHaveLength(2);
    expect(music?.tracks[0].data.notes.map((n) => n.degrees)).toEqual([
        [1],
        [2],
        [3],
    ]);
    expect(music?.tracks[1].data.instrument).toBe('synthBass');
    // And editable, because the reference resolves to the literal upstream.
    expect(isEditable(music?.tracks[0] as never)).toBe(true);
});

test('a lone named track needs no list', () => {
    const music = read(`song: Track([1 2])\nMusic(song)`);
    expect(music?.tracks).toHaveLength(1);
});

test('a music’s signature survives an edit somewhere else', () => {
    // What the editor's cache rests on: a revise preserves the identity of
    // what it didn't touch, so a keystroke elsewhere must not look like a
    // change to this music — otherwise every keystroke re-walks every note.
    const project = projectFrom(`Phrase('hi')\nMusic(Track([1 2 3]))`);
    const music = musicsIn(project)[0];
    const before = musicSignature(project, music);

    const phrase = project
        .getMain()
        .nodes()
        .find(
            (node): node is TextLiteral => node instanceof TextLiteral,
        ) as TextLiteral;
    const revised = project.withRevisedNodes([
        [phrase, TextLiteral.make('there')],
    ]);
    expect(musicSignature(revised, musicsIn(revised)[0])).toBe(before);
});

test('a music’s signature changes when one of its notes does', () => {
    const project = projectFrom(`Music(Track([1 2 3]))`);
    const music = musicsIn(project)[0];
    const before = musicSignature(project, music);
    const list = readMusic(project, music)?.tracks[0].notes;
    if (list === undefined) throw new Error('expected a literal note list');
    const revised = project.withRevisedNodes([
        [list, ListLiteral.make([NumberLiteral.make(9)])],
    ]);
    expect(musicSignature(revised, musicsIn(revised)[0])).not.toBe(before);
});

test('a music’s signature changes when a track bound elsewhere does', () => {
    // The case the music's own node identity would miss: the music is
    // untouched, but the track it names was rewritten.
    const project = projectFrom(`melody: Track([1 2])\nMusic([melody])`);
    const music = musicsIn(project)[0];
    const before = musicSignature(project, music);
    const list = readMusic(project, music)?.tracks[0].notes;
    if (list === undefined) throw new Error('expected a literal note list');
    const revised = project.withRevisedNodes([
        [list, ListLiteral.make([NumberLiteral.make(5)])],
    ]);
    expect(musicSignature(revised, musicsIn(revised)[0])).not.toBe(before);
});

/** A project with supplements, for the ways a track reaches a music by name. */
function multi(main: string, supplements: [string, string][]) {
    return Project.make(
        null,
        'test',
        new Source('start', main),
        supplements.map(([name, code]) => new Source(name, code)),
        DefaultLocale,
    );
}

test('tracks borrowed as a shared list are found and editable', () => {
    // How an import writes itself: the notes live in their own source, and
    // main borrows one shared list of tracks.
    const project = multi(`↓ song.tracks\nMusic(tracks)`, [
        [
            'song',
            `↑ tracks: [\n\tTrack([1 2 3])\n\tTrack([4 5] instrument: Instrument.flute)\n]`,
        ],
    ]);
    const music = readMusic(project, musicsIn(project)[0]);
    expect(music?.tracks).toHaveLength(2);
    expect(music?.tracks[1].data.instrument).toBe('flute');
    // Editable, because the reference resolves to the literal in the other
    // source and edits land there.
    expect(isEditable(music!.tracks[0])).toBe(true);
});

test('tracks borrowed as whole sources are found', () => {
    // How Lyrics.wp is written — 41 sources, each ending in a bare Track. A
    // whole-source borrow resolves to a Source rather than a Bind, so every
    // one of its tracks used to read as none at all.
    const project = multi(`↓ guitar1\n↓ guitar2\nMusic([guitar1 guitar2])`, [
        ['guitar1', `Track([1 2 3])`],
        ['guitar2', `Track([4 5] instrument: Instrument.violin)`],
    ]);
    const music = readMusic(project, musicsIn(project)[0]);
    expect(music?.tracks).toHaveLength(2);
    expect(music?.tracks[1].data.instrument).toBe('violin');
});

test('an unresolvable name is no track rather than a crash', () => {
    const project = multi(`Music([nothing])`, []);
    expect(readMusic(project, musicsIn(project)[0])?.tracks).toHaveLength(0);
});
