/**
 * Pure lookahead scheduling: given a transport and an audio-clock horizon,
 * decide every note onset and every beat tick in the window, and return the
 * advanced transport. The impure shell turns ScheduledNotes into Web Audio
 * nodes; tests just inspect them. A note is decided exactly once, because
 * deciding advances the cursor and adjacent windows share the transport.
 */

import { degreeToSemitones, degreeVoices } from '@output/Music/degrees';
import {
    trackLength,
    type MusicData,
    type NoteData,
    type TrackData,
} from '@output/Music/musicData';
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
    tempo: number;
    /** The music's 0-1 gain. */
    volume: number;
    /** The music's own key and scale, before any track override. */
    key: number;
    scale: readonly number[];
    /** Every track's state on this beat, in track order. */
    parts: readonly PartTick[];
};

export type ScheduleResult = {
    notes: ScheduledNote[];
    beats: BeatTick[];
    next: Transport;
    /** True once every track has scheduled its last note. */
    finished: boolean;
};

/**
 * The note covering the given beat, or undefined when the track has nothing
 * there — before it starts, after a non-looping track ends, or an empty
 * track. A note covers every beat of its span, not just its onset, so a held
 * note reports as covering the beats it sustains through.
 */
export function noteAt(track: TrackData, beat: number): NoteData | undefined {
    return noteCovering(track, beat)?.note;
}

/**
 * The note covering `beat` together with the absolute beat it started on.
 *
 * The onset is what {@link noteAt} throws away and what resuming needs: to pick
 * a held note up part-way through, you have to know how much of it is left.
 */
export function noteCovering(
    track: TrackData,
    beat: number,
): { note: NoteData; onset: number } | undefined {
    const length = trackLength(track);
    if (length <= 0) return undefined;
    /** The absolute beat this pass through the notes began on. */
    let base: number;
    let within: number;
    if (track.loop) {
        base = Math.floor(beat / length) * length;
        within = beat - base;
    } else {
        if (beat < 0 || beat >= length) return undefined;
        base = 0;
        within = beat;
    }
    let onset = 0;
    for (const note of track.notes) {
        if (within < onset + note.beats)
            return within >= onset ? { note, onset: base + onset } : undefined;
        onset += note.beats;
    }
    return undefined;
}

/** Whether a track has a sounding (non-rest) note at the given beat. */
function soundingAt(track: TrackData, beat: number): boolean {
    const note = noteAt(track, beat);
    return note !== undefined && note.degrees.length > 0;
}

/** One track's state on one beat, for `Downbeat`'s `parts`. */
export type PartTick = {
    instrument: string;
    /** A note is audible on this beat; a sustained note still counts. */
    sounding: boolean;
    /** The degrees covering this beat; empty on a rest. */
    degrees: readonly number[];
    /** Those degrees resolved against this track's own scale and key. */
    pitch: readonly number[];
    /** note volume × track volume; 0 when resting. */
    volume: number;
    pan: number;
    scale: readonly number[];
    key: number;
    loop: boolean;
};

/** Snapshot every track at a beat, in track order. */
function partsAt(data: MusicData, beat: number): PartTick[] {
    return data.tracks.map((track) => {
        const note = noteAt(track, beat);
        const degrees = note?.degrees ?? [];
        return {
            instrument: track.instrument,
            sounding: degrees.length > 0,
            degrees,
            pitch: degrees.map((degree) =>
                degreeToSemitones(degree, track.scale, track.key),
            ),
            volume: degrees.length > 0 ? (note?.volume ?? 0) * track.volume : 0,
            pan: track.pan,
            scale: track.scale,
            key: track.key,
            loop: track.loop,
        };
    });
}

/**
 * One note as the scheduler commits it. A chord sounds as several voices, and
 * so does a mashed fractional degree, so each degree contributes as many
 * ScheduledNotes as `degreeVoices` gives it. Shared by the window scheduler
 * and the resume pickup, so a note picked up part-way through resolves its
 * pitch, velocity, and pan exactly the way a normally scheduled one does.
 *
 * `durationBeats` is a parameter rather than `note.beats` because that is the
 * one thing a pickup changes: it plays only what was left.
 */
function scheduledNotes(
    data: MusicData,
    track: TrackData,
    trackIndex: number,
    note: NoteData,
    startBeat: number,
    startTime: number,
    durationBeats: number,
): ScheduledNote[] {
    return note.degrees.flatMap((degree) =>
        degreeVoices(degree, track.scale, track.key, track.mash).map(
            (voice) => ({
                music: data.name,
                trackIndex,
                degree: voice.degree,
                semitones: voice.semitones,
                startBeat,
                startTime,
                durationBeats,
                durationSeconds: (durationBeats * 60) / data.tempo,
                velocity:
                    note.volume * track.volume * data.volume * voice.weight,
                pan: track.pan,
                instrument: track.instrument,
            }),
        ),
    );
}

/**
 * What to re-strike when a frozen music picks up again at `beat`.
 *
 * Resuming rebuilds the cursors at the first onset *at or after* the resume
 * point, which is right for a splice and wrong for a pause: a whole-note pad
 * frozen one beat in would come back to a bar of silence, because the note that
 * was sounding is behind the cursor. So each track's covering note is played
 * again here, shortened to the part that had not been heard yet, and ordinary
 * scheduling carries on from the next onset.
 *
 * Nothing is returned for a rest, for a track whose note begins exactly at
 * `beat` (the scheduler has that one), or for a non-looping track that has run
 * out — in each case there is nothing left over to play.
 */
export function pickupNotes(
    data: MusicData,
    beat: number,
    time: number,
): ScheduledNote[] {
    const notes: ScheduledNote[] = [];
    data.tracks.forEach((track, which) => {
        const covering = noteCovering(track, beat);
        if (covering === undefined || covering.note.degrees.length === 0) return;
        const remaining = covering.onset + covering.note.beats - beat;
        if (covering.onset >= beat || remaining <= 0) return;
        notes.push(
            ...scheduledNotes(
                data,
                track,
                which,
                covering.note,
                beat,
                time,
                remaining,
            ),
        );
    });
    return notes;
}

/** Advance one region — no splice boundary inside — up to `untilTime`. */
function scheduleRegion(
    transport: Transport,
    untilTime: number,
): { notes: ScheduledNote[]; beats: BeatTick[]; next: Transport } {
    const untilBeat = beatAt(transport, untilTime);
    const data = transport.data;
    const notes: ScheduledNote[] = [];

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
            if (note !== undefined && note.degrees.length > 0)
                notes.push(
                    ...scheduledNotes(
                        data,
                        track,
                        which,
                        note,
                        onset,
                        timeOfBeat(transport, onset),
                        note.beats,
                    ),
                );
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
            tempo: data.tempo,
            volume: data.volume,
            key: data.key,
            scale: data.scale,
            parts: partsAt(data, beatCount),
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
