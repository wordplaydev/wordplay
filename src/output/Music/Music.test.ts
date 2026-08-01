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
import NumberValue from '@values/NumberValue';
import { toStage } from '@output/Output/Stage';
import { NameGenerator } from '@output/Output/Stage';
import Music, { MaxTracks, toMusic } from '@output/Music/Music';
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
    expect(value).toBeInstanceOf(ListValue);
    const offsets = (value as ListValue).values.map((element) =>
        element instanceof NumberValue ? element.toNumber() : NaN,
    );
    expect(offsets).toEqual([0, 2, 4, 5, 7, 9, 11]);
    // The semitones unit rides along.
    const first = (value as ListValue).values[0];
    expect(first?.toString()).toContain('semitones');
    // The English alias works too.
    const pentatonic = evaluateCode('Music.pentatonic');
    expect(pentatonic).toBeInstanceOf(ListValue);
    expect((pentatonic as ListValue).values.length).toBe(5);
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

test('music-level tempo, key, volume, and replay convert', () => {
    const music = musicFrom(
        'Music(Track([1]) tempo: 90beats/min key: 2semitones volume: 50% replay: ⊤)',
    );
    expect(music?.tempo).toBe(90);
    expect(music?.key).toBe(2);
    expect(music?.volume).toBe(0.5);
    expect(music?.replay).toBe(true);
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
