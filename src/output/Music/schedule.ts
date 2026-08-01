/**
 * Pure lookahead scheduling: given a transport and an audio-clock horizon,
 * decide every note onset and every beat tick in the window, and return the
 * advanced transport. The impure shell turns ScheduledNotes into Web Audio
 * nodes; tests just inspect them. A note is decided exactly once, because
 * deciding advances the cursor and adjacent windows share the transport.
 */

import { degreeToSemitones } from '@output/Music/degrees';
import { trackLength, type TrackData } from '@output/Music/musicData';
import {
    applySplice,
    beatAt,
    timeOfBeat,
    type Transport,
    type TrackCursor,
} from '@output/Music/transport';

export type ScheduledNote = {
    /** The music's reconciliation name. */
    music: string;
    trackIndex: number;
    /** The degree as written; unpitched instruments index their kit with it. */
    degree: number;
    /** The degree resolved against the track's scale and key. */
    semitones: number;
    startBeat: number;
    /** Audio-clock seconds. */
    startTime: number;
    durationBeats: number;
    durationSeconds: number;
    /** note volume × track volume × music volume. */
    velocity: number;
    pan: number;
    instrument: string;
};

export type BeatTick = {
    music: string;
    /** Beats since the music started, 0 first. */
    count: number;
    /** Audio-clock seconds when this beat sounds. */
    time: number;
    /** The instruments with a note sounding on this beat. */
    instruments: readonly string[];
};

export type ScheduleResult = {
    notes: ScheduledNote[];
    beats: BeatTick[];
    next: Transport;
    /** True once every track has scheduled its last note. */
    finished: boolean;
};

/** Whether a track has a sounding (non-rest) note at the given beat. */
function soundingAt(track: TrackData, beat: number): boolean {
    const length = trackLength(track);
    if (length <= 0) return false;
    let within: number;
    if (track.loop) {
        within = beat - Math.floor(beat / length) * length;
    } else {
        if (beat < 0 || beat >= length) return false;
        within = beat;
    }
    let onset = 0;
    for (const note of track.notes) {
        if (within < onset + note.beats)
            return within >= onset && note.degrees.length > 0;
        onset += note.beats;
    }
    return false;
}

/** Advance one region — no splice boundary inside — up to `untilTime`. */
function scheduleRegion(
    transport: Transport,
    untilTime: number,
): { notes: ScheduledNote[]; beats: BeatTick[]; next: Transport } {
    const untilBeat = beatAt(transport, untilTime);
    const data = transport.data;
    const notes: ScheduledNote[] = [];
    const secondsPerBeat = 60 / data.tempo;

    const cursors: TrackCursor[] = transport.cursors.map((cursor, which) => {
        const track = data.tracks[which];
        if (track === undefined) return cursor;
        // Prefix sums once per track, so advancing is linear in notes decided.
        const prefixes: number[] = [0];
        for (const note of track.notes)
            prefixes.push(prefixes[prefixes.length - 1] + note.beats);
        const length = prefixes[prefixes.length - 1];
        let { index, iteration, done } = cursor;
        while (!done) {
            const onset = iteration * length + prefixes[index];
            if (onset >= untilBeat) break;
            const note = track.notes[index];
            if (note !== undefined && note.degrees.length > 0) {
                for (const degree of note.degrees) {
                    notes.push({
                        music: data.name,
                        trackIndex: which,
                        degree,
                        semitones: degreeToSemitones(
                            degree,
                            track.scale,
                            track.key,
                        ),
                        startBeat: onset,
                        startTime: timeOfBeat(transport, onset),
                        durationBeats: note.beats,
                        durationSeconds: note.beats * secondsPerBeat,
                        velocity: note.volume * track.volume * data.volume,
                        pan: track.pan,
                        instrument: track.instrument,
                    });
                }
            }
            index++;
            if (index >= track.notes.length) {
                if (track.loop) {
                    iteration++;
                    index = 0;
                } else {
                    done = true;
                }
            }
        }
        return { index, iteration, done };
    });

    const beats: BeatTick[] = [];
    let beatCount = transport.beatCount;
    while (beatCount < untilBeat) {
        beats.push({
            music: data.name,
            count: beatCount,
            time: timeOfBeat(transport, beatCount),
            instruments: data.tracks
                .filter((track) => soundingAt(track, beatCount))
                .map((track) => track.instrument)
                .filter((id, index, all) => all.indexOf(id) === index),
        });
        beatCount++;
    }

    return { notes, beats, next: { ...transport, cursors, beatCount } };
}

/** Schedule everything due before `until`, crossing at most one splice
 * boundary (a newer pending change replaces the old one between windows, so
 * only one can be waiting). */
export function scheduleWindow(
    transport: Transport,
    until: number,
): ScheduleResult {
    let current = transport;
    const notes: ScheduledNote[] = [];
    const beats: BeatTick[] = [];

    const pending = current.pending;
    if (pending !== undefined && timeOfBeat(current, pending.atBeat) < until) {
        // Schedule the region before the boundary from the old data, then
        // swap and continue from the boundary with the new.
        const boundaryTime = timeOfBeat(current, pending.atBeat);
        const before = scheduleRegion(current, boundaryTime);
        notes.push(...before.notes);
        beats.push(...before.beats);
        current = applySplice(before.next, pending);
    }

    const region = scheduleRegion(current, until);
    notes.push(...region.notes);
    beats.push(...region.beats);
    current = region.next;

    return {
        notes,
        beats,
        next: current,
        finished: current.cursors.every((cursor) => cursor.done),
    };
}
