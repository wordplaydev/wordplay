/**
 * The plain-data boundary between the evaluated `Music` values and the
 * player. Everything below the boundary — transport, scheduling,
 * reconciliation, voices — is pure functions over these types, unit-testable
 * without an AudioContext; `Music.toData()` is the only producer. All
 * clamping happens here, so pure code never branches on malformed input.
 */

export type NoteData = {
    /** The degrees sounding together; empty is a rest. */
    degrees: readonly number[];
    /** How many beats this entry lasts; never negative. */
    beats: number;
    /** 0-1 gain multiplier for this entry alone. */
    volume: number;
};

export type TrackData = {
    notes: readonly NoteData[];
    /** The instrument id, a key into the palette. */
    instrument: string;
    /** Semitone offsets degrees resolve against. */
    scale: readonly number[];
    /** Semitones to shift the track's notes. */
    key: number;
    /** 0-1 gain multiplier. */
    volume: number;
    /** −1 left … 1 right. */
    pan: number;
    loop: boolean;
    /** Whether a fractional degree sounds as both neighbors or as one bent note. */
    mash: boolean;
};

export type MusicData = {
    /** The reconciliation name assigned by the NameGenerator. */
    name: string;
    /** Beats per minute, clamped to a schedulable range. */
    tempo: number;
    /** 0-1 gain multiplier. */
    volume: number;
    /** The music's own semitone shift, before any track override. Each track
     * already carries its resolved value; this is kept so a `Downbeat` can
     * report what the creator set on the music itself. */
    key: number;
    /** The music's own scale, before any track override. Kept for the same
     * reason as `key`. */
    scale: readonly number[];
    /** True on an evaluation restarts playback from the top. */
    replay: boolean;
    /** While true, playback is frozen where it is and picks up there again. */
    pause: boolean;
    /** The creator's description, spoken when the music can't be heard. */
    description: string | undefined;
    tracks: readonly TrackData[];
};

/** The hard ceiling on tracks, chosen for scheduling and listener limits.
 * Lives here rather than beside the structure so pure consumers — the
 * scheduler, the MIDI importer — can read it without pulling in the basis. */
export const MaxTracks = 128;

/** Beats per minute must be positive and bounded, or the scheduler's window
 * loop has no finite bound. 960 bpm is 16 beats a second — far past music. */
export const MinTempo = 1;
export const MaxTempo = 960;

export function clampTempo(tempo: number): number {
    if (!Number.isFinite(tempo)) return 120;
    return Math.min(MaxTempo, Math.max(MinTempo, tempo));
}

export function clampGain(volume: number): number {
    if (!Number.isFinite(volume)) return 1;
    return Math.min(1, Math.max(0, volume));
}

export function clampPan(pan: number): number {
    if (!Number.isFinite(pan)) return 0;
    return Math.min(1, Math.max(-1, pan));
}

export function clampBeats(beats: number): number {
    if (!Number.isFinite(beats)) return 1;
    return Math.max(0, beats);
}

/**
 * The "did the music change" test: a content signature excluding `name`
 * (identity, compared separately) and `replay` (a command, not content) —
 * exactly the shape of Say's lastSpoken text signature.
 *
 * `pause` is excluded on the same grounds, one step along: it is transport
 * state, not content. Including it would make un-pausing read as an edit and
 * request a splice measured against a frozen origin, which is a boundary
 * somewhere in the middle of nowhere. Both readers want it out — the player,
 * which reconciles content, and the sheet, which re-scores on this signature
 * and should not redraw a staff because someone held the music still.
 */
export function signatureOf(data: MusicData): string {
    return JSON.stringify([
        data.tempo,
        data.volume,
        // The music's own key and scale, which a track may override. Without
        // them, changing the music's key while every track overrides it would
        // be invisible here — the resolved per-track values wouldn't move.
        data.key,
        data.scale,
        data.description ?? null,
        data.tracks.map((track) => [
            track.instrument,
            track.scale,
            track.key,
            track.volume,
            track.pan,
            track.loop,
            track.notes.map((note) => [note.degrees, note.beats, note.volume]),
        ]),
    ]);
}

/** The total beats of one pass through a track; 0 when empty. */
export function trackLength(track: TrackData): number {
    let total = 0;
    for (const note of track.notes) total += note.beats;
    return total;
}

/** The beat at which the note at `index` starts, within one pass. */
export function noteOnset(track: TrackData, index: number): number {
    let onset = 0;
    for (let position = 0; position < index; position++)
        onset += track.notes[position].beats;
    return onset;
}

/**
 * Whether every instrument a piece needs can be played yet.
 *
 * A piece waits as a whole rather than per track: starting the drums while the
 * piano is still arriving would play a fragment of the arrangement, which is
 * worse than a moment's silence. `ready` answers true for an instrument with
 * no recordings to wait for and for one whose recordings failed, so a piece
 * can't be held up forever by a file that will never arrive.
 */
export function musicReady(
    data: MusicData,
    ready: (instrument: string) => boolean,
): boolean {
    return data.tracks.every((track) => ready(track.instrument));
}

/** Every distinct instrument a piece plays, for preloading and for reporting. */
export function musicInstruments(data: MusicData): string[] {
    return [...new Set(data.tracks.map((track) => track.instrument))];
}
