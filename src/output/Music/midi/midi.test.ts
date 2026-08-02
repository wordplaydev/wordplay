import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { DB } from '@db/Database';
import { toStage } from '@output/Output/Stage';
import ExceptionValue from '@values/ExceptionValue';
import { degreeToSemitones } from '@output/Music/degrees';
import { Scales } from '@output/Music/scales';
import parseMIDI, { MIDIFormatError } from '@output/Music/midi/parseMIDI';
import splitVoices, {
    maxPolyphony,
    toSimultaneities,
} from '@output/Music/midi/voices';
import convert, { degreeForPitch, TonicMIDI } from '@output/Music/midi/convert';
import importMIDI, { looksLikeMIDI } from '@output/Music/midi/importMIDI';
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
    options: { division?: number; bpm?: number; program?: number } = {},
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

    // A tempo-only conductor track.
    const micros = Math.round(60_000_000 / (options.bpm ?? 120));
    const conductor = [
        0,
        0xff,
        0x51,
        3,
        (micros >> 16) & 0xff,
        (micros >> 8) & 0xff,
        micros & 0xff,
        0,
        0xff,
        0x2f,
        0,
    ];
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
    expect(instrumentForProgram(24)).toBe('guitar');
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

function evaluate(source: string) {
    const code = `stage: ${source}\nStage([stage])`;
    const project = Project.make(
        null,
        'midi',
        new Source('midi', code),
        [],
        DefaultLocale,
    );
    project.analyze();
    const conflicts = Array.from(project.getConflictedNodes().values()).flat();
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
    const { conflicts, value } = evaluate(result.source);
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
    const { conflicts, evaluator } = evaluate(result.source);
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
    expect(result.source).toContain('Instrument.drums');
    expect(result.source).toContain('♪(1 1beats');
    expect(result.source).toContain('♪(2 1beats');
});
