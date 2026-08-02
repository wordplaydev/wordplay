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
import {
    degreeForKitPiece,
    drumPieceForNote,
    instrumentForProgram,
    PercussionChannel,
} from '@output/Music/midi/gm';
import type { ParsedMIDI } from '@output/Music/midi/parseMIDI';
import splitVoices, {
    maxPolyphony,
    type Simultaneity,
} from '@output/Music/midi/voices';

/** Degree 1 is middle C at key 0, in every scale (see degrees.ts). */
export const TonicMIDI = 60;

/** Beats are rounded to this many decimals so the source stays readable. */
export const BeatPrecision = 3;

export type ConvertOptions = {
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
        | 'tempo-changes'
        | 'time-signature-changes'
        | 'velocity-range'
        | 'pitches-out-of-range';
    /** How many events, tracks, or notes the finding concerns. */
    count: number;
    /** Extra numbers a message may need, e.g. `{ maxError: 0.0005 }`. */
    detail?: Record<string, number | string>;
};

export type Conversion = {
    /** A complete `Music(…)` expression, ready to paste into a program. */
    source: string;
    findings: Finding[];
    /** Tracks emitted, after voice splitting and the MaxTracks cap. */
    trackCount: number;
    /** Notes emitted, rests excluded. */
    noteCount: number;
};

/** Round to `BeatPrecision`, returning the value and the error introduced. */
function roundBeats(beats: number): { value: number; error: number } {
    const factor = 10 ** BeatPrecision;
    const value = Math.round(beats * factor) / factor;
    return { value, error: Math.abs(value - beats) };
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

    // Music carries one tempo, so a tempo map cannot be expressed. Use the
    // first and say how many others were passed over.
    const bpm = midi.tempos[0]?.bpm ?? 120;
    if (midi.tempos.length > 1)
        findings.push({
            kind: 'tempo-changes',
            count: midi.tempos.length - 1,
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

            const push = (
                degrees: number[] | undefined,
                ticks: number,
                volume: number,
            ) => {
                if (ticks <= 0) return;
                const { value, error } = roundBeats(ticks / midi.division);
                if (value <= 0) return;
                maxRoundError = Math.max(maxRoundError, error);
                entries.push(entrySource(degrees, value, volume));
            };

            for (const entry of voice as Simultaneity[]) {
                push(undefined, entry.startTicks - atTicks, 1);

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

                push(degrees, entry.durationTicks, entry.velocity / 127);
                noteCount++;
                atTicks = entry.startTicks + entry.durationTicks;
            }

            if (entries.length === 0) continue;

            // Eight entries a line keeps a long track scannable.
            const lines: string[] = [];
            for (let i = 0; i < entries.length; i += 8)
                lines.push('\t\t\t\t' + entries.slice(i, i + 8).join(' '));
            trackSources.push(
                `\t\tTrack(\n\t\t\t[\n${lines.join('\n')}\n\t\t\t]\n` +
                    `\t\t\tinstrument: Instrument.${instrument}\n` +
                    `\t\t\tloop: ⊥\n\t\t)`,
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
    const source =
        `Music(\n\t[\n${kept.join('\n')}\n\t]\n` +
        `\ttempo: ${tempo}beats/min\n` +
        `\tscale: Music.${scaleKey}\n` +
        (key !== 0 ? `\tkey: ${key}semitones\n` : '') +
        (name !== undefined ? `\tname: '${name.replaceAll("'", '')}'\n` : '') +
        `)`;

    return { source, findings, trackCount: kept.length, noteCount };
}
