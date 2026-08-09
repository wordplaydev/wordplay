import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { DB } from '@db/Database';
import { toStage } from '@output/Output/Stage';
import { BORROW_SYMBOL } from '@parser/Symbols';
import readMusic, { musicsIn } from '@edit/output/editableMusic';
import ExceptionValue from '@values/ExceptionValue';
import { degreeToSemitones } from '@output/Music/degrees';
import { Scales } from '@output/Music/scales';
import parseMIDI, { MIDIFormatError } from '@output/Music/midi/parseMIDI';
import splitVoices, {
    maxPolyphony,
    toSimultaneities,
} from '@output/Music/midi/voices';
import convert, {
    degreeForPitch,
    TonicMIDI,
    type Conversion,
} from '@output/Music/midi/convert';
import importMIDI, { looksLikeMIDI } from '@output/Music/midi/importMIDI';
import {
    DefaultBPM,
    dominantTempo,
    tempoRegions,
} from '@output/Music/midi/tempoMap';
import { drumPieceForNote, instrumentForProgram } from '@output/Music/midi/gm';

/* ---------------------------------------------------------------- fixtures */

/** A variable-length quantity, as SMF encodes delta times. */
function varLength(value: number): number[] {
    const out = [value & 0x7f];
    let rest = value >> 7;
    while (rest > 0) {
        out.unshift((rest & 0x7f) | 0x80);
        rest >>= 7;
    }
    return out;
}

type Event = { at: number; pitch: number; duration: number; velocity?: number };

/**
 * Build a Standard MIDI File in memory, so tests need no fixture on disk and
 * no copyrighted music. Times are in quarter notes.
 */
function midiFile(
    tracks: Event[][],
    options: {
        division?: number;
        bpm?: number;
        program?: number;
        /** Tempo changes, in quarter notes; overrides `bpm` when given. */
        tempos?: { at: number; bpm: number }[];
    } = {},
): Uint8Array {
    const division = options.division ?? 480;
    const bytes: number[] = [];
    const push = (...values: number[]) => bytes.push(...values);
    const u32 = (n: number) => [
        (n >> 24) & 0xff,
        (n >> 16) & 0xff,
        (n >> 8) & 0xff,
        n & 0xff,
    ];

    const trackCount = tracks.length + 1;
    push(
        0x4d, 0x54, 0x68, 0x64,           // "MThd"
        ...u32(6),                        // header length
        0, 1,                             // format 1
        (trackCount >> 8) & 0xff, trackCount & 0xff,
        (division >> 8) & 0xff, division & 0xff,
    );

    // A tempo-only conductor track, carrying one tempo or a whole map.
    const tempos = options.tempos ?? [{ at: 0, bpm: options.bpm ?? 120 }];
    const conductor: number[] = [];
    let lastTempoAt = 0;
    for (const tempo of tempos) {
        const micros = Math.round(60_000_000 / tempo.bpm);
        conductor.push(
            ...varLength(Math.round((tempo.at - lastTempoAt) * division)),
            0xff,
            0x51,
            3,
            (micros >> 16) & 0xff,
            (micros >> 8) & 0xff,
            micros & 0xff,
        );
        lastTempoAt = tempo.at;
    }
    conductor.push(0, 0xff, 0x2f, 0);
    push(0x4d, 0x54, 0x72, 0x6b, ...u32(conductor.length), ...conductor);

    for (const events of tracks) {
        const body: number[] = [];
        if (options.program !== undefined)
            body.push(0, 0xc0, options.program);
        // Absolute-time on/off pairs, sorted, then delta-encoded.
        const points: { at: number; on: boolean; e: Event }[] = [];
        for (const e of events) {
            points.push({ at: e.at, on: true, e });
            points.push({ at: e.at + e.duration, on: false, e });
        }
        points.sort((a, b) => a.at - b.at || (a.on ? 1 : -1));
        let last = 0;
        for (const p of points) {
            const deltaTicks = Math.round((p.at - last) * division);
            body.push(...varLength(deltaTicks));
            body.push(
                p.on ? 0x90 : 0x80,
                p.e.pitch,
                p.on ? (p.e.velocity ?? 100) : 0,
            );
            last = p.at;
        }
        body.push(0, 0xff, 0x2f, 0);
        push(0x4d, 0x54, 0x72, 0x6b, ...u32(body.length), ...body);
    }
    return new Uint8Array(bytes);
}

/* ------------------------------------------------------------------ parser */

test('the parser reads notes, tempo, and division', () => {
    const bytes = midiFile(
        [[{ at: 0, pitch: 60, duration: 1 }, { at: 1, pitch: 64, duration: 2 }]],
        { bpm: 96 },
    );
    expect(looksLikeMIDI(bytes)).toBe(true);
    const midi = parseMIDI(bytes);
    expect(midi.division).toBe(480);
    expect(Math.round(midi.tempos[0].bpm)).toBe(96);
    const notes = midi.tracks.flatMap((t) => t.notes);
    expect(notes.map((n) => [n.pitch, n.durationTicks / 480])).toEqual([
        [60, 1],
        [64, 2],
    ]);
});

test('the parser refuses what it cannot represent', () => {
    expect(() => parseMIDI(new Uint8Array([1, 2, 3]))).toThrow(MIDIFormatError);
    expect(looksLikeMIDI(new Uint8Array([1, 2, 3]))).toBe(false);
});

/* ------------------------------------------------------------------ voices */

test('notes starting and ending together are one chord, not three voices', () => {
    const notes = [60, 64, 67].map((pitch) => ({
        startTicks: 0,
        durationTicks: 480,
        pitch,
        velocity: 100,
    }));
    expect(toSimultaneities(notes)).toHaveLength(1);
    expect(toSimultaneities(notes)[0].pitches).toEqual([60, 64, 67]);
    expect(splitVoices(notes)).toHaveLength(1);
});

test('overlapping notes of different lengths split into voices', () => {
    // A held note under two shorter ones needs exactly two voices.
    const notes = [
        { startTicks: 0, durationTicks: 960, pitch: 48, velocity: 100 },
        { startTicks: 0, durationTicks: 480, pitch: 60, velocity: 100 },
        { startTicks: 480, durationTicks: 480, pitch: 62, velocity: 100 },
    ];
    const voices = splitVoices(notes);
    expect(voices).toHaveLength(2);
    // The moving line stays together in one voice rather than scattering.
    const moving = voices.find((v) => v.length === 2);
    expect(moving?.map((e) => e.pitches[0])).toEqual([60, 62]);
    expect(maxPolyphony(notes)).toBe(2);
});

test('a note ending where another begins is not an overlap', () => {
    const notes = [
        { startTicks: 0, durationTicks: 480, pitch: 60, velocity: 100 },
        { startTicks: 480, durationTicks: 480, pitch: 62, velocity: 100 },
    ];
    expect(maxPolyphony(notes)).toBe(1);
    expect(splitVoices(notes)).toHaveLength(1);
});

/* ------------------------------------------------------------------ pitch */

test('every MIDI pitch has an exact chromatic degree', () => {
    const chromatic = Scales.chromatic;
    for (let pitch = 0; pitch <= 127; pitch++) {
        const { degree, error } = degreeForPitch(pitch, chromatic, 0);
        expect(error).toBe(0);
        // The degree really does resolve back to the pitch it came from.
        expect(degreeToSemitones(degree, chromatic, 0)).toBe(pitch - TonicMIDI);
    }
});

test('a scale without the pitch class snaps, and says how far', () => {
    // C# is not in C major, so it must move a semitone.
    const { error } = degreeForPitch(61, Scales.major, 0);
    expect(error).toBe(1);
    // D is in C major, so it must not.
    expect(degreeForPitch(62, Scales.major, 0).error).toBe(0);
});

/* ------------------------------------------------------------ GM mapping */

test('General MIDI families map to instruments we have', () => {
    expect(instrumentForProgram(0)).toBe('piano');
    // The guitar family splits: 24 is GM's nylon acoustic, 25 up are steel
    // or amplified.
    expect(instrumentForProgram(24)).toBe('acousticGuitar');
    expect(instrumentForProgram(25)).toBe('electricGuitar');
    expect(instrumentForProgram(30)).toBe('electricGuitar');
    expect(instrumentForProgram(33)).toBe('synthBass');
    expect(instrumentForProgram(40)).toBe('violin');
    expect(instrumentForProgram(56)).toBe('trumpet');
    expect(instrumentForProgram(73)).toBe('flute');
    expect(drumPieceForNote(36)).toBe('bass');
    expect(drumPieceForNote(38)).toBe('snare');
    expect(drumPieceForNote(42)).toBe('hihat');
    // A GM sound we have no piece for is reported, not guessed at.
    expect(drumPieceForNote(70)).toBeUndefined();
});

/* --------------------------------------------------------------- findings */

test('the chromatic default reports no pitch movement', () => {
    const result = importMIDI(
        midiFile([[{ at: 0, pitch: 61, duration: 1 }]]),
    );
    const snapped = result.findings.find((f) => f.kind === 'pitches-snapped');
    expect(snapped?.count).toBe(0);
});

test('a scale that omits pitches reports every one it moved', () => {
    const result = importMIDI(midiFile([[{ at: 0, pitch: 61, duration: 1 }]]), {
        scale: 'major',
    });
    const snapped = result.findings.find((f) => f.kind === 'pitches-snapped');
    expect(snapped?.count).toBe(1);
    expect(snapped?.detail?.maxSemitones).toBe(1);
});

test('splitting is reported as the cost it is', () => {
    const result = importMIDI(
        midiFile([
            [
                { at: 0, pitch: 48, duration: 2 },
                { at: 0, pitch: 60, duration: 1 },
            ],
        ]),
    );
    const split = result.findings.find((f) => f.kind === 'tracks-split');
    expect(split?.count).toBe(1);
    expect(split?.detail?.extraTracks).toBe(1);
    expect(result.trackCount).toBe(2);
});

test('findings carry numbers, never prose', () => {
    // The core must stay localizable: a finding is data the CLI or a dialog
    // turns into a sentence, so no long English may leak into it.
    const result = importMIDI(midiFile([[{ at: 0, pitch: 60, duration: 1 }]]));
    for (const finding of result.findings) {
        expect(typeof finding.kind).toBe('string');
        expect(finding.kind).not.toContain(' ');
        for (const value of Object.values(finding.detail ?? {}))
            if (typeof value === 'string') expect(value.length).toBeLessThan(40);
    }
});

/* ------------------------------------------------------- the real contract */

/** Build the two-source project a conversion describes, and evaluate it. */
function evaluate(result: Conversion) {
    // A conversion is two sources now: the program that plays the music, and
    // the notes it borrows. Evaluating one without the other proves nothing —
    // the borrow is the part most likely to be wrong.
    const project = Project.make(
        null,
        'midi',
        new Source('start', result.main),
        [new Source(result.sourceName, result.tracks)],
        DefaultLocale,
    );
    project.analyze();
    const conflicts = Array.from(project.getConflictedNodes().values()).flat();
    for (const c of conflicts) console.log('CONFLICT:', c.constructor.name);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    return { conflicts, value, evaluator };
}

test('the emitted source is valid Wordplay that evaluates', () => {
    const result = importMIDI(
        midiFile(
            [
                [
                    { at: 0, pitch: 60, duration: 1 },
                    { at: 1.5, pitch: 64, duration: 0.5 },
                    { at: 2, pitch: 67, duration: 2 },
                ],
                [
                    { at: 0, pitch: 48, duration: 4 },
                    { at: 0, pitch: 52, duration: 4 },
                ],
            ],
            { bpm: 84 },
        ),
        { name: 'test' },
    );
    const { conflicts, value } = evaluate(result);
    expect(conflicts).toHaveLength(0);
    expect(value).not.toBeInstanceOf(ExceptionValue);
});

test('onsets and durations survive the round trip', () => {
    // Deliberately off any grid: this is the claim that durations are kept.
    const events = [
        { at: 0, pitch: 60, duration: 0.979 },
        { at: 1.104, pitch: 62, duration: 0.229 },
        { at: 2.5, pitch: 64, duration: 1.5 },
    ];
    const result = importMIDI(midiFile([events], { division: 1000 }));
    const { conflicts, evaluator } = evaluate(result);
    expect(conflicts).toHaveLength(0);

    const stage = toStage(evaluator, evaluator.getInitialValue()!);
    const music = stage?.getMusic()[0];
    expect(music).toBeDefined();
    const track = music!.toData().tracks[0];

    // Walk the emitted entries, accumulating onsets; rests carry the gaps.
    let at = 0;
    const sounded: { at: number; beats: number }[] = [];
    for (const note of track.notes) {
        if (note.degrees.length > 0) sounded.push({ at, beats: note.beats });
        at += note.beats;
    }
    expect(sounded).toHaveLength(events.length);
    events.forEach((event, i) => {
        expect(sounded[i].at).toBeCloseTo(event.at, 2);
        expect(sounded[i].beats).toBeCloseTo(event.duration, 2);
    });
});

/* ------------------------------------------------------------ tempo maps */

/** When a quarter-note position is heard, integrating a file's tempo map. */
function secondsAt(
    quarters: number,
    tempos: { at: number; bpm: number }[],
): number {
    let seconds = 0;
    for (let i = 0; i < tempos.length; i++) {
        const from = tempos[i].at;
        if (quarters <= from) break;
        const to = i + 1 < tempos.length ? tempos[i + 1].at : Infinity;
        seconds += ((Math.min(quarters, to) - from) * 60) / tempos[i].bpm;
    }
    return seconds;
}

/** The sounding notes of a conversion, as beats and as seconds. */
function heard(result: Conversion) {
    const { conflicts, evaluator } = evaluate(result);
    expect(conflicts).toHaveLength(0);
    const stage = toStage(evaluator, evaluator.getInitialValue()!);
    const data = stage!.getMusic()[0]!.toData();
    let beat = 0;
    const notes: { at: number; seconds: number }[] = [];
    for (const note of data.tracks[0].notes) {
        if (note.degrees.length > 0)
            notes.push({
                at: (beat * 60) / data.tempo,
                seconds: (note.beats * 60) / data.tempo,
            });
        beat += note.beats;
    }
    return { notes, beats: beat, tempo: data.tempo };
}

test('regions cover tick zero onward, however the file declares them', () => {
    // A file with no tempo at all means MIDI's default, and one whose first
    // change comes late is that default until it arrives.
    expect(tempoRegions([])).toEqual([{ ticks: 0, bpm: DefaultBPM }]);
    expect(tempoRegions([{ ticks: 480, bpm: 90 }])).toEqual([
        { ticks: 0, bpm: DefaultBPM },
        { ticks: 480, bpm: 90 },
    ]);
    // Two declarations at one tick is the later one; order is by tick, not file.
    expect(
        tempoRegions([
            { ticks: 480, bpm: 90 },
            { ticks: 0, bpm: 60 },
            { ticks: 480, bpm: 100 },
        ]),
    ).toEqual([
        { ticks: 0, bpm: 60 },
        { ticks: 480, bpm: 100 },
    ]);
});

test('the fixed tempo is the one held longest, not the one declared first', () => {
    // A four-bar intro should not decide how the rest of the piece is written.
    const regions = tempoRegions([
        { ticks: 0, bpm: 60 },
        { ticks: 100, bpm: 132 },
    ]);
    expect(dominantTempo(regions, 1000)).toBe(132);
    expect(dominantTempo(regions, 150)).toBe(60);
});

test('a tempo change is folded into the note lengths, not dropped', () => {
    // Six quarter notes at 60bpm, then two at 120. `Music` has one tempo, so
    // the fast ones must be *written* shorter to be *heard* faster.
    const tempos = [
        { at: 0, bpm: 60 },
        { at: 6, bpm: 120 },
    ];
    const events = Array.from({ length: 8 }, (_, i) => ({
        at: i,
        pitch: 60 + i,
        duration: 1,
    }));
    const { notes } = heard(importMIDI(midiFile([events], { tempos })));

    expect(notes).toHaveLength(events.length);
    events.forEach((event, i) => {
        expect(notes[i].at, `onset of note ${i}`).toBeCloseTo(
            secondsAt(event.at, tempos),
            2,
        );
        expect(notes[i].seconds, `length of note ${i}`).toBeCloseTo(
            secondsAt(event.at + event.duration, tempos) -
                secondsAt(event.at, tempos),
            2,
        );
    });
    // And the second half really is written shorter, not merely played so.
    expect(notes[7].seconds).toBeCloseTo(notes[0].seconds / 2, 2);
});

test('one tempo leaves the score its own beats', () => {
    // Nothing to fold means nothing to scale: a quarter note is one beat, and
    // there is no finding to report.
    const result = importMIDI(
        midiFile(
            [
                [
                    { at: 0, pitch: 60, duration: 1 },
                    { at: 1, pitch: 62, duration: 0.5 },
                    { at: 2, pitch: 64, duration: 2 },
                ],
            ],
            { bpm: 84 },
        ),
    );
    expect(result.tracks).toContain('♪(1 1beats');
    expect(result.tracks).toContain('♪(3 0.5beats');
    expect(result.tracks).toContain('♪(5 2beats');
    expect(result.findings.some((f) => f.kind === 'tempo-folded')).toBe(false);
});

test('rounding does not pile up over a long track', () => {
    // The reason positions are rounded rather than lengths. Scaled by a third,
    // every note in the fast region is a non-terminating number of beats;
    // rounding each length would walk the end of the track a sixth of a beat
    // off, which is audible. Rounding the running position cannot drift.
    const tempos = [
        { at: 0, bpm: 40 },
        { at: 400, bpm: 120 },
    ];
    const events = Array.from({ length: 700 }, (_, i) => ({
        at: i,
        pitch: 60,
        duration: 1,
    }));
    const { notes, beats, tempo } = heard(
        importMIDI(midiFile([events], { tempos, division: 480 })),
    );

    expect(tempo).toBe(40);
    // 400 beats at 1, then 300 at a third.
    expect(beats).toBeCloseTo(400 + 300 / 3, 3);
    // And the last note is heard when the file says, not a beat late.
    const last = notes[notes.length - 1];
    expect(last.at).toBeCloseTo(secondsAt(699, tempos), 2);
});

test('the tempo finding says the changes were kept, not lost', () => {
    const result = importMIDI(
        midiFile(
            [
                [
                    { at: 0, pitch: 60, duration: 1 },
                    { at: 4, pitch: 62, duration: 1 },
                ],
            ],
            {
                tempos: [
                    { at: 0, bpm: 60 },
                    { at: 4, bpm: 120 },
                ],
            },
        ),
    );
    const finding = result.findings.find((f) => f.kind === 'tempo-folded');
    expect(finding?.count).toBe(1);
    expect(finding?.detail?.using).toBe(60);
});

test('a percussion channel maps to drum-kit degrees', () => {
    // Channel 10 is index 9; midiFile writes channel 0, so drive the mapper
    // through convert with a hand-made parse result instead.
    const midi = parseMIDI(
        midiFile([[{ at: 0, pitch: 36, duration: 1 }, { at: 1, pitch: 38, duration: 1 }]]),
    );
    // Track 0 is the tempo-only conductor track; the notes are in the next.
    const notes = midi.tracks.find((track) => track.notes.length > 0);
    expect(notes).toBeDefined();
    notes!.channel = 9;
    const result = convert(midi);
    // bass is kit index 0 → degree 1, snare index 1 → degree 2. Entries also
    // carry a volume, since velocity 100 of 127 isn't full.
    expect(result.tracks).toContain('Instrument.drums');
    expect(result.tracks).toContain('♪(1 1beats');
    expect(result.tracks).toContain('♪(2 1beats');
});

test('editing the program an import writes does not re-analyze the notes', () => {
    // The regression this exists for: every analysis cache lives on the Project
    // instance and an edit makes a new Project, so re-deriving every source on
    // each keystroke made editing a two-line program that borrows a song take
    // about a second. Measured at ~60x apart; a fifth is a wide margin that
    // still fails outright if a cache stops being carried.
    const events = Array.from({ length: 150 }, (_, i) => ({
        at: i,
        pitch: 60 + (i % 12),
        duration: 1,
    }));
    const result = importMIDI(midiFile(Array(12).fill(events)), {
        name: 'test',
    });
    const main = new Source('start', result.main);
    const project = Project.make(
        null,
        'midi',
        main,
        [new Source(result.sourceName, result.tracks)],
        DefaultLocale,
    );

    // What loading the project costs, once.
    const opened = performance.now();
    project.analyze();
    project.getLocalesUsed();
    const cold = performance.now() - opened;

    // What one edit to the program costs, every time.
    const edited = main.withCode(result.main + '\n1 + 1');
    const started = performance.now();
    const revised = project.withSource(main, edited);
    revised.analyze();
    project.getNewConflicts(main, edited);
    revised.getLocalesUsed();
    const warm = performance.now() - started;

    expect(
        warm,
        `editing the program cost ${warm.toFixed(1)}ms against ${cold.toFixed(1)}ms to open the project`,
    ).toBeLessThan(cold / 5);
});

test('an import is a small program and a source full of notes', () => {
    // The point of the two-source form. The program stays something a creator
    // can read, and the notes live in a source whose tile starts collapsed —
    // so they cost no layout until someone opens them, and editing the program
    // no longer drags thousands of nodes along with it.
    const events = Array.from({ length: 200 }, (_, i) => ({
        at: i,
        pitch: 60 + (i % 12),
        duration: 1,
    }));
    const result = importMIDI(midiFile([events, events]), { name: 'test' });

    // Two lines of program: bring the notes in, and play them.
    expect(result.main.split('\n')[0]).toBe(`${BORROW_SYMBOL} song`);
    expect(result.main).toContain('Music(');
    expect(result.main).not.toContain('♪');
    expect(result.main.length).toBeLessThan(200);

    // And the notes are all in the other source.
    expect(result.tracks).toContain('♪');
    expect(result.tracks.length).toBeGreaterThan(result.main.length * 10);

    // Which parses and evaluates as one project.
    const { conflicts, value } = evaluate(result);
    expect(conflicts).toHaveLength(0);
    expect(value).not.toBeInstanceOf(ExceptionValue);
});

test('the borrowed tracks are readable by the music editor', () => {
    // The borrow has to resolve all the way to the Track expressions, or the
    // palette shows a music with nothing in it.
    const events = [{ at: 0, pitch: 60, duration: 1 }];
    const result = importMIDI(midiFile([events, events]), { name: 'test' });
    const project = Project.make(
        null,
        'midi',
        new Source('start', result.main),
        [new Source(result.sourceName, result.tracks)],
        DefaultLocale,
    );
    const music = readMusic(project, musicsIn(project)[0]);
    expect(music?.tracks).toHaveLength(result.trackCount);
    // And editable, so a note can be moved from the palette.
    expect(music?.tracks[0].notes).toBeDefined();
});
