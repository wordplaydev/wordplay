/**
 * The per-named-Music state that persists across evaluations: where the beat
 * is, where each track's cursor is, and what change is waiting for the next
 * beat boundary. Pure and immutable; times are audio-clock seconds supplied
 * by the caller, so tests use a plain number.
 *
 * Beats are absolute: beat 0 is where playback started, and splices re-anchor
 * `originTime`/`originBeat` without restarting the count, so a tempo change
 * keeps `beatAt` continuous and track phase is preserved. Cursor onsets are
 * recomputed from prefix sums each pass rather than accumulated, so error
 * stays bounded over arbitrarily long loops.
 */

import {
    trackLength,
    noteOnset,
    type MusicData,
    type TrackData,
} from '@output/Music/musicData';

export type TrackCursor = {
    /** The next note index to schedule, within the current pass. */
    index: number;
    /** Which pass through the notes we're on; 0 first. */
    iteration: number;
    /** True once a non-looping track has scheduled its last note. */
    done: boolean;
};

export type Transport = {
    /** The version of the music currently sounding. */
    data: MusicData;
    /** Audio-clock seconds at `originBeat`. */
    originTime: number;
    /** The beat at `originTime`; advanced on tempo splices. */
    originBeat: number;
    cursors: readonly TrackCursor[];
    /** A change waiting to land at a beat boundary; newest wins. */
    pending: { data: MusicData; atBeat: number } | undefined;
    /** True once the music has exited the stage and is finishing. */
    draining: boolean;
    /** The next integer beat to emit as a BeatTick. */
    beatCount: number;
};

function createCursor(track: TrackData): TrackCursor {
    // A looping track with no positive length can never advance; treat it as
    // done rather than spinning.
    const empty =
        track.notes.length === 0 || (track.loop && trackLength(track) <= 0);
    return { index: 0, iteration: 0, done: empty };
}

export function createTransport(data: MusicData, now: number): Transport {
    return {
        data,
        originTime: now,
        originBeat: 0,
        cursors: data.tracks.map(createCursor),
        pending: undefined,
        draining: false,
        beatCount: 0,
    };
}

/** The (fractional) beat sounding at the given audio-clock time. */
export function beatAt(transport: Transport, time: number): number {
    return (
        transport.originBeat +
        ((time - transport.originTime) * transport.data.tempo) / 60
    );
}

/** The audio-clock time of the given beat. */
export function timeOfBeat(transport: Transport, beat: number): number {
    return (
        transport.originTime +
        ((beat - transport.originBeat) * 60) / transport.data.tempo
    );
}

/** The absolute beat at which a cursor's next note starts. */
export function cursorOnset(track: TrackData, cursor: TrackCursor): number {
    return (
        cursor.iteration * trackLength(track) + noteOnset(track, cursor.index)
    );
}

/**
 * Queue a changed version of the music to land at the next beat boundary,
 * strictly in the future so already-sounding onsets aren't re-decided. A
 * newer change before the boundary replaces the queued one.
 */
export function requestSplice(
    transport: Transport,
    data: MusicData,
    now: number,
): Transport {
    const atBeat = Math.floor(Math.max(beatAt(transport, now), 0)) + 1;
    return { ...transport, pending: { data, atBeat } };
}

/** Mark the music as exited, letting non-looping tracks finish. */
export function drain(transport: Transport): Transport {
    return { ...transport, draining: true };
}

/**
 * Rebuild cursors for new data at a splice boundary, preserving phase: each
 * track resumes at its first onset at or after the boundary beat, so an
 * edited melody keeps the groove rather than restarting its pattern.
 */
export function cursorsAt(
    data: MusicData,
    boundary: number,
): readonly TrackCursor[] {
    return data.tracks.map((track) => {
        const cursor = createCursor(track);
        if (cursor.done) return cursor;
        const length = trackLength(track);
        if (track.loop && length > 0) {
            const iteration = Math.floor(boundary / length);
            const within = boundary - iteration * length;
            let index = 0;
            while (
                index < track.notes.length &&
                noteOnset(track, index) < within
            )
                index++;
            // Past the last onset within this pass: start the next pass.
            return index >= track.notes.length
                ? { index: 0, iteration: iteration + 1, done: false }
                : { index, iteration, done: false };
        }
        // Non-looping: resume at the first remaining onset, or be done.
        let index = 0;
        while (index < track.notes.length && noteOnset(track, index) < boundary)
            index++;
        return index >= track.notes.length
            ? { index: track.notes.length, iteration: 0, done: true }
            : { index, iteration: 0, done: false };
    });
}

/** Apply a pending splice at its boundary, re-anchoring the clock there so a
 * tempo change keeps `beatAt` continuous. */
export function applySplice(
    transport: Transport,
    pending: { data: MusicData; atBeat: number },
): Transport {
    return {
        data: pending.data,
        originTime: timeOfBeat(transport, pending.atBeat),
        originBeat: pending.atBeat,
        cursors: cursorsAt(pending.data, pending.atBeat),
        pending: undefined,
        draining: transport.draining,
        beatCount: transport.beatCount,
    };
}
