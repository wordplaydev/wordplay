import { expect, test } from 'vitest';
import { DB, Locales } from '@db/Database';
import Project from '@db/projects/Project';
import { readProjects } from '../../examples/readProjects';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { Sym } from '@nodes/Sym';
import { tokens } from '@parser/Tokenizer';
import Evaluator from '@runtime/Evaluator';
import evaluateCode from '@runtime/evaluate';
import ListValue from '@values/ListValue';
import StructureValue from '@values/StructureValue';
import TypeException from '@values/TypeException';
import NumberValue from '@values/NumberValue';
import { toStage } from '@output/Output/Stage';
import { NameGenerator } from '@output/Output/Stage';
import Music, { MaxTracks, toMusic } from '@output/Music/Music';
import Group from '@output/Output/Group';
import { toInstrument } from '@output/Music/Instrument';
import { degreeToSemitones } from '@output/Music/degrees';
import { Scales } from '@output/Music/scales';
import { InstrumentKeys } from '@output/Music/instruments';

/** Build a Music from a music-producing program (the Phrase.test.ts pattern:
 * projects with the same locale share a cached Basis, so type identity holds
 * across the evaluating and converting projects). */
function musicFrom(code: string): Music | undefined {
    const value = evaluateCode(code);
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return value ? toMusic(project, value, new NameGenerator()) : undefined;
}

/** Build a Stage from a program, for collection tests. */
function stageFrom(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    return value ? toStage(evaluator, value) : undefined;
}

test('degrees resolve against the scale, wrapping octaves both directions', () => {
    const major = Scales.major;
    // The tonic, and the octave above it.
    expect(degreeToSemitones(1, major)).toBe(0);
    expect(degreeToSemitones(8, major)).toBe(12);
    // A third is two degrees up.
    expect(degreeToSemitones(3, major)).toBe(4);
    // Key shifts everything.
    expect(degreeToSemitones(1, major, 2)).toBe(2);
    // Degrees at and below zero wrap down an octave, which plain list
    // indexing cannot express.
    expect(degreeToSemitones(0, major)).toBe(-1);
    expect(degreeToSemitones(-6, major)).toBe(-12);
    // Non-heptatonic lengths move the octave: degree 6 in a pentatonic is an
    // octave up, degree 9 in a bebop scale is an octave up.
    expect(degreeToSemitones(6, Scales.pentatonic)).toBe(12);
    expect(degreeToSemitones(9, Scales.bebopDominant)).toBe(12);
});

test('every scale is ascending, deduplicated, and rooted at 0', () => {
    for (const offsets of Object.values(Scales)) {
        expect(offsets[0]).toBe(0);
        for (let index = 1; index < offsets.length; index++) {
            expect(offsets[index]).toBeGreaterThan(offsets[index - 1]);
            expect(offsets[index]).toBeLessThan(12);
        }
    }
});

test('named scales are statics on Music, by emoji and English alias', () => {
    const value = evaluateCode('🎼.major');
    if (!(value instanceof ListValue)) throw new Error('expected a list');
    const offsets = value.values.map((element) =>
        element instanceof NumberValue ? element.toNumber() : NaN,
    );
    expect(offsets).toEqual([0, 2, 4, 5, 7, 9, 11]);
    // The semitones unit rides along.
    expect(value.values[0]?.toString()).toContain('semitones');
    // The English alias works too.
    const pentatonic = evaluateCode('Music.pentatonic');
    if (!(pentatonic instanceof ListValue)) throw new Error('expected a list');
    expect(pentatonic.values.length).toBe(5);
});

test('instruments are statics on Instrument, by emoji and English alias', () => {
    const byEmoji = toInstrument(evaluateCode('🔈.🎹'));
    expect(byEmoji?.id).toBe('piano');
    const byName = toInstrument(evaluateCode('Instrument.drums'));
    expect(byName?.id).toBe('drums');
});

test("Music's scale default forward-references the major static", () => {
    const music = musicFrom('Music(Track([1 3 5]))');
    expect(music).toBeInstanceOf(Music);
    expect(music?.scale).toEqual([0, 2, 4, 5, 7, 9, 11]);
    // And Track's instrument default reaches across structures.
    expect(music?.tracks[0]?.instrument.id).toBe('piano');
});

test('a track normalizes rests, chords, and per-note overrides', () => {
    const music = musicFrom(
        'Music(🎶([1 ø {1 3 5} ♪(8 2beats volume: 50%)] instrument: 🔈.🔔 beat: 0.5beats loop: ⊥))',
    );
    const track = music?.tracks[0];
    expect(track?.notes.map((note) => [...note.degrees])).toEqual([
        [1],
        [],
        [1, 3, 5],
        [8],
    ]);
    // Bare entries defer to the track's grid; a ♪ carries its own.
    expect(track?.notes[0]?.beats).toBeUndefined();
    expect(track?.notes[3]?.beats).toBe(2);
    expect(track?.notes[3]?.volume).toBe(0.5);
    expect(track?.beat).toBe(0.5);
    expect(track?.instrument.id).toBe('bell');
    expect(track?.loop).toBe(false);
});

test('a triplet is honest arithmetic: 2beats ÷ 3 narrows back to a number', () => {
    const music = musicFrom('Music(Track([♪(1 2beats ÷ 3)]))');
    const beats = music?.tracks[0]?.notes[0]?.beats;
    expect(beats).toBeCloseTo(2 / 3, 10);
});

test('music-level tempo, key, volume, replay, and pause convert', () => {
    const music = musicFrom(
        'Music(Track([1]) tempo: 90beats/min key: 2semitones volume: 50% replay: ⊤ pause: ⊤)',
    );
    expect(music?.tempo).toBe(90);
    expect(music?.key).toBe(2);
    expect(music?.volume).toBe(0.5);
    expect(music?.replay).toBe(true);
    expect(music?.pause).toBe(true);
    expect(music?.toData().pause).toBe(true);
});

test('pause defaults to off, so an ordinary music plays', () => {
    // The bind sits between replay and name, and getOutputInputs destructures
    // positionally — a misplaced one would shift the name in silently.
    const music = musicFrom("Music(Track([1]) name: 'tune')");
    expect(music?.pause).toBe(false);
    expect(music?.getName()).toBe('tune');
});

test('track scale and key overrides default to deferring', () => {
    const music = musicFrom(
        'Music([🎶([1]) 🎶([1] scale: [0semitones 3semitones] key: -2semitones pan: -1)])',
    );
    expect(music?.tracks[0]?.scale).toBeUndefined();
    expect(music?.tracks[0]?.key).toBeUndefined();
    expect(music?.tracks[1]?.scale).toEqual([0, 3]);
    expect(music?.tracks[1]?.key).toBe(-2);
    expect(music?.tracks[1]?.pan).toBe(-1);
});

test('stages collect music from content and groups, in source order', () => {
    const stage = stageFrom(
        "Stage([Phrase('hi') Music(Track([1]) name: 'a') Group(Stack() [Music(Track([2]) name: 'b')])])",
    );
    const music = stage?.getMusic() ?? [];
    expect(music.map((entry) => entry.getName())).toEqual(['a', 'b']);
});

test('a bare Music program is wrapped in a stage', () => {
    const stage = stageFrom('Music(Track([1 2 3]))');
    expect(stage?.getMusic()).toHaveLength(1);
});

test('music alongside one phrase makes no implicit group', () => {
    // Music is heard, not seen, so it must not count toward the "several outputs
    // need arranging" threshold: doing so wrapped the lone phrase in a Group the
    // creator could see outlined and select, but that held nothing visible.
    const stage = stageFrom("Music(Track([1 2 3]))\nPhrase('hi')");
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Phrase',
        'Music',
    ]);
    // The music still reaches the stage's visualizations.
    expect(stage?.getMusic()).toHaveLength(1);
});

test('music alongside several phrases groups only the phrases', () => {
    const stage = stageFrom(
        "Music(Track([1 2 3]))\nPhrase('hi')\nPhrase('there')",
    );
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Group',
        'Music',
    ]);
    const group = stage?.content[0];
    expect(group instanceof Group ? group.content.length : undefined).toBe(2);
    expect(stage?.getMusic()).toHaveLength(1);
});

test('music beside an explicit stage rides along on it', () => {
    // A program with a stage and a song is two result expressions, so its value
    // is a list. The stage used to be taken alone and everything beside it
    // dropped, which silenced the song with no error anywhere.
    const stage = stageFrom("Stage([Phrase('hi')])\nMusic(Track([1 2 3]))");
    expect(stage?.explicit).toBe(true);
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Phrase',
        'Music',
    ]);
    expect(stage?.getMusic()).toHaveLength(1);
});

test('a literal list of a stage and music merges the same way', () => {
    // Same path, but reached by writing the list rather than by Block.collect
    // building one out of several result expressions.
    const stage = stageFrom("[Stage([Phrase('hi')]) Music(Track([1 2 3]))]");
    expect(stage?.getMusic()).toHaveLength(1);
});

test('output before the stage still lands after its content', () => {
    // The stage's own content is what the creator composed deliberately, so
    // leftovers go after it — and content order is draw order, so they're on top.
    const stage = stageFrom("Music(Track([1]))\nStage([Phrase('hi')])");
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Phrase',
        'Music',
    ]);
});

test('stray phrases beside a stage join it flat, with no implicit group', () => {
    // The synthesized Stack group exists only because a stageless program has
    // nothing to say what the layout is. Here the stage does, so strays get
    // exactly what typing them into its content list would have given them.
    const stage = stageFrom("Stage([Phrase('a')])\nPhrase('b')\nPhrase('c')");
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Phrase',
        'Phrase',
        'Phrase',
    ]);
});

test('the last stage still wins, and carries the rest of the list', () => {
    // Stages can't nest and an earlier one's background and frame have no merge
    // rule, so it's still discarded — but the music isn't its, it's the list's.
    const stage = stageFrom(
        "Stage([Phrase('a')] name: 'first')\nStage([Phrase('b')] name: 'second')\nMusic(Track([1]))",
    );
    expect(stage?.getName()).toBe('second');
    expect(stage?.getMusic()).toHaveLength(1);
});

test('merging does not change the order names are generated in', () => {
    // Names are handed out as the list is read, and a colliding one gets a
    // suffix. Reading the stage's content late (or early) would swap which of
    // these two 'a's is the original — and a music whose name moved is
    // reconciled as a different piece and restarts on every evaluation.
    expect(
        stageFrom(
            "Stage([Phrase('hi' name: 'a')])\nMusic(Track([1]) name: 'a')",
        )
            ?.getMusic()[0]
            ?.getName(),
    ).toBe('a2');
    expect(
        stageFrom(
            "Music(Track([1]) name: 'a')\nStage([Phrase('hi' name: 'a')])",
        )
            ?.getMusic()[0]
            ?.getName(),
    ).toBe('a');
});

test('a say beside an explicit stage rides along too', () => {
    // Say is heard rather than seen, like Music, and reaches the speech
    // synthesizer through the same content walk.
    const stage = stageFrom("Stage([Phrase('hi')])\nSay('hello')");
    expect(stage?.getSays()).toHaveLength(1);
});

test('unnamed music gets a stable generated name across evaluations', () => {
    // Names derive from creator node ids, which are stable for as long as the
    // program is: converting the same value twice (as consecutive evaluations
    // of an unedited program do) must yield the same name.
    const code = 'Music(Track([1]))';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    expect(value).toBeDefined();
    const first = toStage(evaluator, value!)?.getMusic()[0]?.getName();
    const second = toStage(evaluator, value!)?.getMusic()[0]?.getName();
    expect(first).toBeDefined();
    expect(first).toBe(second);
});

test('the track list is capped at MaxTracks', () => {
    expect(MaxTracks).toBe(128);
});

test('every instrument name is a single name token, including native names', () => {
    // The Kiowa and Chippewa names use U+02BC (modifier letter apostrophe),
    // since U+0027 is Wordplay's text delimiter and would end the name.
    const names = [
        ...InstrumentKeys,
        'सितार',
        '二胡',
        'عود',
        'zampoña',
        'tâhpeno',
        'bĭbĭʼgwûn',
        'ćotaŋke',
        'doʼmbaʼ',
        'Šiyótȟaŋka',
        'bícusirina',
        'achipiquon',
        'TcháHeHeLonNe',
    ];
    for (const name of names) {
        const list = tokens(name).filter((token) => !token.isSymbol(Sym.End));
        expect(
            list.map((token) => token.getText()),
            `expected "${name}" to be one token`,
        ).toEqual([name]);
        expect(list[0]?.isSymbol(Sym.Name), name).toBe(true);
    }
});

test('the Chimes example plays music through its keyboard', async () => {
    // The example is the demonstration of the gap this feature closes: an
    // instrument that used to make no sound. Its music is no longer elided,
    // so the stage must actually carry a Music.
    const [example] = readProjects('examples').filter((project) =>
        project.name.includes('Chimes'),
    );
    expect(example).toBeDefined();
    const project = await Project.deserialize(Locales, example);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    expect(value).toBeDefined();
    const music = toStage(evaluator, value!)?.getMusic() ?? [];
    expect(music).toHaveLength(1);
    // A bell on a pentatonic scale, one-shot rather than looping.
    const data = music[0].toData();
    expect(data.tracks[0]?.instrument).toBe('bell');
    expect(data.tracks[0]?.loop).toBe(false);
    expect(data.tracks[0]?.scale).toEqual([0, 2, 4, 7, 9]);
});

const Whole = '\u{1D15D}';
const Half = '\u{1D157}\u{1D165}';
const Quarter = '\u{1D158}\u{1D165}';
const Eighth = '\u{1D158}\u{1D165}\u{1D16E}';
const DottedQuarter = Quarter + '\u{1D16D}';

test('a note value written as a unit gives one entry its own length', () => {
    const music = musicFrom(
        `Music(Track([1 2${Half} 3${Eighth} 4${DottedQuarter} 5${Whole}]))`,
    );
    const track = music?.tracks[0];
    // The number is still the degree — `2𝅗𝅥` is degree two, not two half notes.
    expect(track?.notes.map((note) => [...note.degrees])).toEqual([
        [1],
        [2],
        [3],
        [4],
        [5],
    ]);
    // A bare entry still defers to the track's grid.
    expect(track?.notes.map((note) => note.beats)).toEqual([
        undefined,
        2,
        0.5,
        1.5,
        4,
    ]);
});

test('a note value on a chord speaks for the whole chord', () => {
    const music = musicFrom(`Music(Track([{1${Half} 3 5}]))`);
    expect(music?.tracks[0]?.notes[0]?.degrees).toEqual([1, 3, 5]);
    expect(music?.tracks[0]?.notes[0]?.beats).toBe(2);
});

test('a beat input reads a note value as a count of it', () => {
    // Here the number *is* a count, so `1𝅘𝅥𝅮` is an eighth-note grid — the same
    // thing `0.5beats` says, in notation.
    expect(
        musicFrom(`Music(Track([1] beat: 1${Eighth}))`)?.tracks[0]?.beat,
    ).toBe(0.5);
    expect(
        musicFrom(`Music(Track([1] beat: 2${Eighth}))`)?.tracks[0]?.beat,
    ).toBe(1);
    expect(musicFrom(`Music(Track([1] beat: 1${Half}))`)?.tracks[0]?.beat).toBe(
        2,
    );
    // And a plain beats number still works.
    expect(musicFrom('Music(Track([1] beat: 0.5beats))')?.tracks[0]?.beat).toBe(
        0.5,
    );
});

test('a note value survives into the data a player schedules', () => {
    // toData resolves every entry's length, so this is what actually sounds.
    const data = musicFrom(
        `Music(Track([1 2${Half} 3] beat: 1${Eighth}))`,
    )?.toData();
    expect(data?.tracks[0]?.notes.map((note) => note.beats)).toEqual([
        0.5, 2, 0.5,
    ]);
});

test('a ♪ takes a note value on either its degree or its beat', () => {
    expect(
        musicFrom(`Music(Track([♪(1 1${Half})]))`)?.tracks[0]?.notes[0]?.beats,
    ).toBe(2);
    // A note value on the degree is more specific than the beat input, whose
    // default always supplies a number, so it wins.
    expect(
        musicFrom(`Music(Track([♪(1${Half} 3beats)]))`)?.tracks[0]?.notes[0]
            ?.beats,
    ).toBe(2);
});

test('a unit that is not a note value is rejected, not silently ignored', () => {
    // The narrowed type catches this twice over: as a conflict while editing
    // (below), and as a TypeException if it somehow evaluates anyway. That
    // matters most for `2beats`, which is a real unit and the plausible typo —
    // silently playing it at the default length would be the worst outcome.
    expect(evaluateCode('Music(Track([1 2beats]))')).toBeInstanceOf(
        TypeException,
    );
    expect(evaluateCode('Music(Track([1 2kitty]))')).toBeInstanceOf(
        TypeException,
    );
    expect(evaluateCode(`Music(Track([1 2${Half}]))`)).toBeInstanceOf(
        StructureValue,
    );
});

test('a note value in a note list type-checks and a stray unit does not', () => {
    function conflictsIn(code: string) {
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        project.analyze();
        return project.analyze().conflicts;
    }
    expect(
        conflictsIn(`Music(Track([1 2${Half} {3${Eighth} 5}]))`),
    ).toHaveLength(0);
    expect(conflictsIn(`Music(Track([1] beat: 1${Eighth}))`)).toHaveLength(0);
    // `beats` is a real unit, and exactly the plausible typo, so it has to fail.
    expect(conflictsIn('Music(Track([1 2beats]))').length).toBeGreaterThan(0);
    expect(conflictsIn('Music(Track([1 2kitty]))').length).toBeGreaterThan(0);
    expect(conflictsIn(`Music(Track([{1 2beats}]))`).length).toBeGreaterThan(0);
});

test('the guitar split keeps older projects playing', () => {
    // `guitar` became two instruments, and the palette id changed with it.
    // The *name* deliberately did not: a project written before the split
    // says `guitar`, and it has to keep meaning the acoustic one.
    expect(toInstrument(evaluateCode('Instrument.guitar'))?.id).toBe(
        'acousticGuitar',
    );
    expect(toInstrument(evaluateCode('🔈.🎸'))?.id).toBe('acousticGuitar');
    expect(toInstrument(evaluateCode('Instrument.acousticGuitar'))?.id).toBe(
        'acousticGuitar',
    );
    expect(toInstrument(evaluateCode('Instrument.electricGuitar'))?.id).toBe(
        'electricGuitar',
    );
    expect(toInstrument(evaluateCode('🔈.⚡'))?.id).toBe('electricGuitar');
});
