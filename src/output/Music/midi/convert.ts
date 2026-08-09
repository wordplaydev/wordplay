/**
 * Turning parsed MIDI into Wordplay `Music` notation, and accounting for
 * everything the notation cannot carry.
 *
 * The findings are the point as much as the source is: a creator importing
 * their own music deserves to know what arrived intact and what didn't. They
 * are structured data, never sentences, so the CLI can print English and a
 * future import dialog can render localized text from the same values.
 *
 * Two facts shape the output. `Note` carries its own length, so durations
 * need no quantizing — a note lasting 0.979 beats is written as such. And a
 * track's entries must tile without gaps, so silence is a rest of exactly the
 * right length rather than padding to a grid.
 */

import { degreeToSemitones } from '@output/Music/degrees';
import { instrumentSpec, type InstrumentKey } from '@output/Music/instruments';
import { MaxTracks } from '@output/Music/musicData';
import { Scales, type ScaleKey } from '@output/Music/scales';
import { BORROW_SYMBOL } from '@parser/Symbols';
import {
    degreeForKitPiece,
    drumPieceForNote,
    instrumentForProgram,
    PercussionChannel,
} from '@output/Music/midi/gm';
import type { ParsedMIDI } from '@output/Music/midi/parseMIDI';
import {
    dominantTempo,
    tempoRegions,
    tempoScale,
} from '@output/Music/midi/tempoMap';
import splitVoices, { maxPolyphony } from '@output/Music/midi/voices';

/** Degree 1 is middle C at key 0, in every scale (see degrees.ts). */
export const TonicMIDI = 60;

/** Beats are rounded to this many decimals so the source stays readable. */
export const BeatPrecision = 3;

export type ConvertOptions = {
    /** What to call the source holding the tracks. */
    sourceName?: string;
    /** The scale degrees resolve against; chromatic loses no pitch. */
    scale?: ScaleKey | undefined;
    /** Semitones to shift the whole piece. */
    key?: number | undefined;
    /** The music's name, which is its identity for reconciliation. */
    name?: string | undefined;
};

/**
 * Something the notation could not carry, or carried only approximately.
 * `kind` is a stable identifier; `count` and `detail` are the numbers a
 * message is built from. No English lives here.
 */
export type Finding = {
    kind:
        | 'tracks-split'
        | 'notes-dropped-percussion'
        | 'tracks-truncated'
        | 'pitches-snapped'
        | 'beats-rounded'
        | 'tempo-folded'
        | 'time-signature-changes'
        | 'velocity-range'
        | 'pitches-out-of-range';
    /** How many events, tracks, or notes the finding concerns. */
    count: number;
    /** Extra numbers a message may need, e.g. `{ maxError: 0.0005 }`. */
    detail?: Record<string, number | string>;
};

/**
 * What the imported source and its shared list are called by default.
 *
 * Plain, guessable names rather than ones unlikely to collide: if a program
 * already uses them, Wordplay's own duplicate-name conflict says so and the
 * creator renames — better than a name nobody would choose to type. The
 * importer numbers past anything already taken.
 */
export const DefaultSourceName = 'song';

export type Conversion = {
    /**
     * What belongs in the program that plays the music: a borrow of the
     * tracks, then a `Music(…)` referring to them. The borrow comes first
     * because a program's borrows are parsed before anything else.
     */
    main: string;
    /**
     * What belongs in its own source: one shared list holding every track.
     *
     * Separate so the notes are somewhere a creator needn't look. A
     * supplement's tile starts collapsed and an unmounted tile renders nothing,
     * so thousands of notes cost no layout until someone opens them — and the
     * program stays two lines, which is what makes editing it fast.
     *
     * One source holding a list rather than one per track, because a borrow names
     * one thing: fifty-four tracks would otherwise be fifty-four borrow lines
     * and fifty-four tiles.
     */
    tracks: string;
    /** What to call the source holding the tracks. */
    sourceName: string;
    findings: Finding[];
    /** Tracks emitted, after voice splitting and the MaxTracks cap. */
    trackCount: number;
    /** Notes emitted, rests excluded. */
    noteCount: number;
};

/** How many of the smallest written beat unit make a beat. */
const BeatUnits = 10 ** BeatPrecision;

/**
 * Round to `BeatPrecision`, in whole units as well as beats. Callers track
 * position in whole units so that a length is the difference of two integers
 * and carries none of the noise of subtracting two decimals.
 */
function roundBeats(beats: number): {
    units: number;
    value: number;
    error: number;
} {
    const units = Math.round(beats * BeatUnits);
    const value = units / BeatUnits;
    return { units, value, error: Math.abs(value - beats) };
}

/**
 * The degree that sounds a given MIDI pitch, and how far it had to move.
 *
 * On the chromatic scale every pitch has an exact degree, so the error is
 * always zero. On any other scale the pitch classes the scale omits have no
 * degree at all, and the nearest one is used — that is the only place this
 * converter changes a note.
 */
export function degreeForPitch(
    pitch: number,
    scale: readonly number[],
    key: number,
): { degree: number; error: number } {
    const semitones = pitch - TonicMIDI - key;
    const octave = Math.floor(semitones / 12);
    const pitchClass = ((semitones % 12) + 12) % 12;

    let bestIndex = 0;
    let bestError = Infinity;
    for (let i = 0; i < scale.length; i++) {
        const error = Math.abs(scale[i] - pitchClass);
        if (error < bestError) {
            bestError = error;
            bestIndex = i;
        }
    }

    // A scale's own octave is its length in degrees, however many semitones
    // its offsets happen to span — degreeToSemitones defines it that way.
    const degree = bestIndex + 1 + octave * scale.length;
    const actual = degreeToSemitones(degree, scale, key);
    return { degree, error: Math.abs(actual - (pitch - TonicMIDI)) };
}

/** A degree, chord, or rest as it appears inside a track's note list. */
function entrySource(
    degrees: number[] | undefined,
    beats: number,
    volume: number,
): string {
    const what =
        degrees === undefined
            ? 'ø'
            : degrees.length === 1
              ? `${degrees[0]}`
              : `{${degrees.join(' ')}}`;
    const percent = Math.round(volume * 100);
    // A full-volume note doesn't need to say so; the default is 100%.
    return percent >= 100
        ? `♪(${what} ${beats}beats)`
        : `♪(${what} ${beats}beats ${percent}%)`;
}

/** Convert parsed MIDI into a `Music` expression plus an honest accounting. */
export default function convert(
    midi: ParsedMIDI,
    options: ConvertOptions = {},
): Conversion {
    const scaleKey: ScaleKey = options.scale ?? 'chromatic';
    const scale = Scales[scaleKey];
    const key = options.key ?? 0;
    const findings: Finding[] = [];

    // Music carries one tempo, so a tempo map cannot be written as one. Fix
    // the music at the tempo held longest and scale every length by the tempo
    // in force where it sits, so the piece is heard as written. See tempoMap.
    const regions = tempoRegions(midi.tempos);
    const endTicks = midi.tracks.reduce(
        (end, track) =>
            track.notes.reduce(
                (last, note) =>
                    Math.max(last, note.startTicks + note.durationTicks),
                end,
            ),
        0,
    );
    const bpm = dominantTempo(regions, endTicks);
    const beatsAt = tempoScale(regions, bpm, midi.division);
    if (regions.length > 1)
        findings.push({
            kind: 'tempo-folded',
            count: regions.length - 1,
            detail: { using: Math.round(bpm * 100) / 100 },
        });
    if (midi.timeSignatures.length > 1)
        findings.push({
            kind: 'time-signature-changes',
            count: midi.timeSignatures.length - 1,
        });

    let droppedPercussion = 0;
    let snapped = 0;
    let maxSnapError = 0;
    let maxRoundError = 0;
    let noteCount = 0;
    let splitTracks = 0;
    let extraVoices = 0;
    let outOfRange = 0;

    const trackSources: string[] = [];

    for (const track of midi.tracks) {
        if (track.notes.length === 0) continue;

        const percussion = track.channel === PercussionChannel;
        const instrument: InstrumentKey = percussion
            ? 'drums'
            : instrumentForProgram(track.program ?? 0);
        const spec = instrumentSpec(instrument);
        const kit = spec?.kit;

        // Percussion pitches name kit pieces rather than notes, so map them
        // before splitting: sounds we have no piece for never reach a voice.
        let notes = track.notes;
        if (percussion && kit !== undefined) {
            const kept = [];
            for (const note of notes) {
                const piece = drumPieceForNote(note.pitch);
                const degree =
                    piece === undefined
                        ? undefined
                        : degreeForKitPiece(kit, piece);
                if (degree === undefined) droppedPercussion++;
                // Carry the degree in `pitch` so the shared path below can
                // use it directly; percussion skips scale resolution.
                else kept.push({ ...note, pitch: degree });
            }
            notes = kept;
        }
        if (notes.length === 0) continue;

        const velocities = notes.map((note) => note.velocity);
        const spread = Math.max(...velocities) - Math.min(...velocities);
        if (spread > 0)
            findings.push({
                kind: 'velocity-range',
                count: spread,
                detail: { track: track.name ?? `${trackSources.length + 1}` },
            });

        const voices = splitVoices(notes);
        if (voices.length > 1) {
            splitTracks++;
            extraVoices += voices.length - 1;
        }
        // Polyphony and voice count agree except where chords collapse, which
        // is why the finding reports voices rather than raw polyphony.
        void maxPolyphony;

        for (const voice of voices) {
            const entries: string[] = [];
            let atTicks = 0;
            // The running position, in whole units of the last decimal a beat
            // is written to. Emitting the difference of two rounded positions
            // rather than a rounded length keeps a track's total drift at one
            // rounding step instead of one per note.
            let emitted = 0;

            const push = (
                degrees: number[] | undefined,
                fromTicks: number,
                toTicks: number,
                volume: number,
            ) => {
                if (toTicks <= fromTicks) return;
                const { units, error } = roundBeats(beatsAt(toTicks));
                maxRoundError = Math.max(maxRoundError, error);
                // Shorter than the last decimal of a beat: there is no length
                // to write, and the position has not moved.
                if (units <= emitted) return;
                entries.push(
                    entrySource(degrees, (units - emitted) / BeatUnits, volume),
                );
                emitted = units;
            };

            for (const entry of voice) {
                push(undefined, atTicks, entry.startTicks, 1);

                let degrees: number[];
                if (percussion) degrees = entry.pitches;
                else {
                    degrees = entry.pitches.map((pitch) => {
                        const { degree, error } = degreeForPitch(
                            pitch,
                            scale,
                            key,
                        );
                        if (error > 0) {
                            snapped++;
                            maxSnapError = Math.max(maxSnapError, error);
                        }
                        const semitones = pitch - TonicMIDI;
                        if (semitones < -36 || semitones > 36) outOfRange++;
                        return degree;
                    });
                }

                push(
                    degrees,
                    entry.startTicks,
                    entry.startTicks + entry.durationTicks,
                    entry.velocity / 127,
                );
                noteCount++;
                atTicks = entry.startTicks + entry.durationTicks;
            }

            if (entries.length === 0) continue;

            // Eight entries a line keeps a long track scannable.
            const lines: string[] = [];
            for (let i = 0; i < entries.length; i += 8)
                lines.push('\t\t\t\t' + entries.slice(i, i + 8).join(' '));
            trackSources.push(
                `Track(\n\t[\n${lines.join('\n')}\n\t]\n` +
                    `\tinstrument: Instrument.${instrument}\n` +
                    `\tloop: ⊥\n)`,
            );
        }
    }

    if (splitTracks > 0)
        findings.push({
            kind: 'tracks-split',
            count: splitTracks,
            detail: { extraTracks: extraVoices },
        });
    if (droppedPercussion > 0)
        findings.push({
            kind: 'notes-dropped-percussion',
            count: droppedPercussion,
        });
    findings.push({
        kind: 'pitches-snapped',
        count: snapped,
        detail: { maxSemitones: maxSnapError, scale: scaleKey },
    });
    findings.push({
        kind: 'beats-rounded',
        count: noteCount,
        detail: { maxError: Math.round(maxRoundError * 1e6) / 1e6 },
    });
    if (outOfRange > 0)
        findings.push({ kind: 'pitches-out-of-range', count: outOfRange });

    // More voices than Music will play: keep the first, and say so.
    let kept = trackSources;
    if (trackSources.length > MaxTracks) {
        findings.push({
            kind: 'tracks-truncated',
            count: trackSources.length - MaxTracks,
            detail: { cap: MaxTracks },
        });
        kept = trackSources.slice(0, MaxTracks);
    }

    const tempo = Math.round(bpm * 100) / 100;
    const name = options.name;

    /**
     * Each track is bound to its own name and the music refers to them, rather
     * than nesting every track inside one expression.
     *
     * This is about what the editor can draw. It windows the root block's
     * statement list, so a program is only as expensive to render as the
     * statements in view — but a music written as one nested expression is one
     * statement, and the whole of it renders at once. A 5,000-note import that
     * way is tens of thousands of nodes in a single synchronous pass, which
     * freezes the tab before a single note appears.
     *
     * It also reads better: a track a line is something a creator can scan and
     * rename, where a wall of nested notes is not.
     */
    const sourceName = options.sourceName ?? DefaultSourceName;

    // The notes, in their own source: a list of tracks as its last expression.
    //
    // Borrowed as a whole source rather than as a `↑` share, which would have
    // to declare its languages — a shared name without them is an error, and an
    // importer has no business choosing a language for someone's music. A
    // source's value is its last expression, so the list is what the borrow
    // yields. It is also how Lyrics is written.
    const tracks =
        `[\n` +
        kept.map((track) => `\t${track.replaceAll('\n', '\n\t')}`).join('\n') +
        `\n]`;

    // The program that plays them. The borrow comes first because a program's
    // borrows are parsed before anything else.
    const main =
        `${BORROW_SYMBOL} ${sourceName}\n` +
        `Music(\n\t${sourceName}\n` +
        `\ttempo: ${tempo}beats/min\n` +
        `\tscale: Music.${scaleKey}\n` +
        (key !== 0 ? `\tkey: ${key}semitones\n` : '') +
        (name !== undefined ? `\tname: '${name.replaceAll("'", '')}'\n` : '') +
        `)`;

    return {
        main,
        tracks,
        sourceName,
        findings,
        trackCount: kept.length,
        noteCount,
    };
}
