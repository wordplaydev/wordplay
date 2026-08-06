/**
 * Humming into notes.
 *
 * The microphone gives a pitch per frame and nothing else — `computePitch`
 * returns Hz, or 0 when it isn't confident. Everything between that and a
 * `Track` has to be decided here: where notes begin and end, how long they
 * are in beats, what key and scale they are in, and which degree each one is.
 *
 * Kept pure and fed frames so every one of those decisions can be tested
 * against a sequence someone wrote down, rather than only by humming at it.
 *
 * **It is deliberately conservative.** A singer is not a MIDI keyboard: the
 * pitch wobbles, the onsets are soft, and the tempo drifts. Every threshold
 * here errs toward dropping something uncertain rather than writing a note
 * nobody sang, because a wrong note is worse than a missing one — you can
 * hear the gap and add it, but a wrong note has to be found first.
 */

import { degreeToSemitones } from '@output/Music/degrees';
import { ScaleKeys, Scales, type ScaleKey } from '@output/Music/scales';
import type { NoteData } from '@output/Music/musicData';

/** One frame of pitch detection. */
export type Frame = {
    /** Hz, or 0 when the detector wasn't confident. */
    hz: number;
    /** Milliseconds since recording began. */
    at: number;
    /**
     * How loud this frame was, 0-1, as the RMS of the window it came from.
     *
     * Carried because confidence alone does not tell singing from noise. On a
     * real take of Happy Birthday the detector reported pitches two octaves
     * below the melody, at clarities up to 0.977 — breath and room noise that
     * McLeod is happy to find a period in. What separated them was loudness:
     * those frames sat around 0.008 while the singing sat around 0.086.
     */
    level: number;
};

/** A sung note, before it is fitted to a scale. */
export type Sung = {
    /** Average pitch in MIDI semitones, fractional. */
    pitch: number;
    /** When it began, in milliseconds. */
    at: number;
    /** How long it lasted, in milliseconds. */
    ms: number;
    /** Its loudest frame, relative to the take's loudest. */
    level: number;
};

/** What a recording became. */
export type Transcription = {
    notes: NoteData[];
    /** The scale it was fitted to. */
    scale: ScaleKey;
    /** Semitones the scale was shifted by. */
    key: number;
    /** Beats per minute it was measured at. */
    tempo: number;
};

/** A4, the pitch every other one is measured from. */
const ConcertA = 440;
/** MIDI note number of A4. */
const ConcertAMIDI = 69;

/**
 * The shortest thing counted as a note, in milliseconds.
 *
 * Below this it is a stray frame between two real notes — a consonant, a
 * breath, the detector catching an overtone as the voice changes pitch.
 */
export const MinNoteMs = 90;

/**
 * How far the pitch may wander within one note, in semitones.
 *
 * A voice is not steady, and a singer sliding into a note passes through
 * everything below it. Tried at 0.9 and 0.7 against a real take of Happy
 * Birthday, on the theory that a one-semitone step could not otherwise start a
 * new note: both were worse. Every semitone a slide passes through settles
 * long enough to be written down, so the take came back with 14 and 17 notes
 * against this value's 11, most of the extras a semitone from their neighbour.
 *
 * What separates two notes of the same or adjacent pitch is not the pitch — it
 * is the syllable. See the loudness gate in `segment`.
 */
export const PitchTolerance = 1.2;

/** How long a gap has to be to end a note rather than be sung through. */
export const MinGapMs = 80;

/**
 * How loud a note has to be, against the loudest of the take, to count as sung.
 *
 * Measured rather than guessed. On a real take the notes the detector invented
 * out of breath and room noise peaked between 0.03 and 0.06 of the take's
 * loudest, and every note actually sung sat between 0.31 and 1.0 — a five-fold
 * gap with nothing in it. This sits in that gap, well clear of both sides.
 *
 * It has to be relative: an absolute floor would throw away a whole quiet
 * recording and keep all of a loud one's noise.
 */
export const MinLevel = 0.15;

/**
 * How many consecutive frames must agree that the pitch has moved before it
 * counts as a new note.
 *
 * Three, because two cannot tell a slide from an arrival. A voice sliding
 * between two notes moves something like a semitone a frame, so any two
 * consecutive frames of it sit within the tolerance and look settled; across
 * three the slide spans more than the tolerance and the vibrato of a held note
 * still doesn't. That is the difference between writing the note that was sung
 * and writing every semitone on the way to it.
 */
export const MoveFrames = 3;

/**
 * How closely those frames must agree, in semitones.
 *
 * Tighter than `PitchTolerance`, and that asymmetry is the point: a note is
 * allowed to wander while it is being held, but arriving somewhere new has to
 * look like arriving. A slide is still moving, so its frames disagree with
 * each other by roughly the distance it covers per frame; a note that has
 * landed does not.
 */
export const SettleSpread = PitchTolerance / 2;

/**
 * What one extra scale degree costs, in semitones of average error.
 *
 * A seven-note major scale must explain the singing about a seventh of a
 * semitone better per note than a five-note pentatonic to be preferred, and
 * chromatic must beat major by nearly a semitone — which only a melody that
 * genuinely uses every semitone can do.
 */
export const DegreeCost = 0.07;

/** Hz to fractional MIDI semitones. */
export function toMIDI(hz: number): number {
    return ConcertAMIDI + 12 * Math.log2(hz / ConcertA);
}

/**
 * Group frames into sung notes.
 *
 * A note ends when the voice stops (a run of unconfident frames long enough to
 * be a real gap) or when it moves far enough to be a different note. Short
 * gaps are sung through rather than ending a note, since the detector loses
 * confidence briefly on almost every vowel change.
 */
export function segment(frames: readonly Frame[]): Sung[] {
    const notes: Sung[] = [];
    // The loudest frame of the take, which every note is judged against.
    let loudest = 0;
    for (const frame of frames) loudest = Math.max(loudest, frame.level);

    let held:
        | { pitches: number[]; at: number; last: number; level: number }
        | undefined;
    let silentSince: number | undefined;
    // Frames that have disagreed with the held note's pitch, kept until they
    // either add up to a move or are contradicted by a frame that agrees.
    let departed: { pitch: number; at: number; level: number }[] = [];

    const finish = (end: number) => {
        if (held === undefined) return;
        const ms = end - held.at;
        if (ms >= MinNoteMs)
            notes.push({
                // The median, not the mean: a slide into a note drags a mean
                // toward the pitch that was passed through rather than sung.
                pitch: median(held.pitches),
                at: held.at,
                ms,
                level: loudest > 0 ? held.level / loudest : 0,
            });
        held = undefined;
        departed = [];
    };

    const floor = loudest * MinLevel;
    for (const frame of frames) {
        // Too quiet to be singing is the same as no pitch at all. This does
        // two jobs at once: it drops the frames the detector invents out of
        // breath and room noise, and it splits a repeated note, because the
        // dip between two syllables of one pitch is a gap the existing rule
        // already knows how to end a note on. Nothing about the pitch track
        // can separate "hap-py" — both syllables are the same note.
        if (frame.hz <= 0 || frame.level < floor) {
            if (silentSince === undefined) silentSince = frame.at;
            else if (frame.at - silentSince >= MinGapMs) finish(silentSince);
            continue;
        }
        silentSince = undefined;
        const pitch = toMIDI(frame.hz);

        if (
            held !== undefined &&
            Math.abs(pitch - median(held.pitches)) > PitchTolerance
        ) {
            // A departure on its own proves nothing — a voice passes through
            // everything between two notes. Wait for it to persist.
            departed.push({ pitch, at: frame.at, level: frame.level });
            // A move counts only once the voice has *settled* somewhere else.
            // Persistence alone isn't enough: a slide between two notes departs
            // and keeps departing, and writing a note for every semitone it
            // passes through is the "lots of random notes" this is here to
            // avoid. So the last few frames have to agree with each other, not
            // merely disagree with the note being left.
            const settled = departed.slice(-MoveFrames);
            if (
                settled.length >= MoveFrames &&
                Math.max(...settled.map((d) => d.pitch)) -
                    Math.min(...settled.map((d) => d.pitch)) <=
                    SettleSpread
            ) {
                const [first] = settled;
                // The slide belongs to the note being left, so the old note
                // runs until the new one settles.
                finish(first.at);
                held = {
                    pitches: settled.map((d) => d.pitch),
                    at: first.at,
                    last: frame.at,
                    level: Math.max(...settled.map((d) => d.level)),
                };
            }
            continue;
        }

        // A frame that agrees means whatever we saw was passing, not a move.
        departed = [];
        if (held === undefined)
            held = {
                pitches: [pitch],
                at: frame.at,
                last: frame.at,
                level: frame.level,
            };
        else {
            held.pitches.push(pitch);
            held.last = frame.at;
            held.level = Math.max(held.level, frame.level);
        }
    }
    finish(silentSince ?? (frames[frames.length - 1]?.at ?? 0));

    // Drop what was never sung. The detector finds a confident pitch in breath
    // and room noise, and those notes are the ones that wreck everything
    // downstream: the quietest of them decides the tonic, and the shortest
    // decides the tempo.
    return notes.filter((note) => note.level >= MinLevel);
}

function median(values: readonly number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

/**
 * A tempo that makes the sung notes land on sensible lengths.
 *
 * The shortest note is taken to be one beat, which is the assumption that
 * needs the least from the singer: it makes a steady hum come out as a row of
 * quarter notes rather than as a rhythm nobody intended. A creator who wanted
 * something else can change the tempo afterwards, and the notes keep their
 * relative lengths.
 */
export function tempoOf(notes: readonly Sung[]): number {
    if (notes.length === 0) return 120;
    const shortest = Math.min(...notes.map((note) => note.ms));
    if (shortest <= 0) return 120;
    // Clamped to a range a person can actually hum in; a stray short note
    // would otherwise imply a tempo of several hundred.
    return Math.max(40, Math.min(240, Math.round(60000 / shortest)));
}

/**
 * The scale and key that fit the sung pitches best.
 *
 * Every scale at every key is tried and scored by how far each note has to
 * move to reach one of its degrees. Exhaustive because it is cheap — nineteen
 * scales by twelve keys is a few hundred comparisons on a handful of notes —
 * and because the alternative is a heuristic that would be wrong in ways
 * nobody could predict from the outside.
 */
export function fit(notes: readonly Sung[]): { scale: ScaleKey; key: number } {
    if (notes.length === 0) return { scale: 'major', key: 0 };
    // Everything is measured relative to the lowest note, so the fit doesn't
    // depend on which octave the person happened to sing in.
    const lowest = Math.min(...notes.map((note) => note.pitch));
    // Weighted by how long each note was held: a note sung for half a second
    // says more about the key than one passed through on the way to it.
    const total = notes.reduce((sum, note) => sum + Math.max(note.ms, 1), 0);

    let best: { scale: ScaleKey; key: number; cost: number } | undefined;
    for (const scale of ScaleKeys) {
        const offsets = Scales[scale];
        if (offsets.length === 0) continue;
        for (let key = 0; key < 12; key++) {
            let cost = 0;
            for (const note of notes) {
                const relative = note.pitch - lowest - key;
                const octave = ((relative % 12) + 12) % 12;
                let closest = Infinity;
                for (const offset of offsets)
                    closest = Math.min(
                        closest,
                        Math.abs(octave - offset),
                        // The wrap: an 11 is one semitone from the next 0.
                        Math.abs(octave - offset - 12),
                    );
                cost += (closest * Math.max(note.ms, 1)) / total;
            }
            // What a scale's extra degrees cost it.
            //
            // Without this the answer is always chromatic. Its offsets are
            // every semitone — a superset of every other scale's — so its
            // distance is never worse and is better the moment a voice is even
            // slightly off a degree, which is always. Nothing then gets snapped
            // to a key, and every wobble becomes a different note, which is
            // exactly what a hummed tune must not do.
            //
            // So a scale has to *earn* its degrees: this is charged per degree
            // beyond a pentatonic's five, in semitones of average error, and a
            // bigger scale only wins by explaining the singing that much
            // better. A genuinely chromatic melody still reaches for chromatic,
            // because there its extra degrees pay for themselves.
            const complexity = DegreeCost * Math.max(0, offsets.length - 5);
            const score = cost + complexity;
            // Ties go to the earlier scale, which is the simpler one: the
            // table is ordered with major and minor first.
            if (best === undefined || score < best.cost - 1e-9)
                best = { scale, key, cost: score };
        }
    }
    return { scale: best?.scale ?? 'major', key: best?.key ?? 0 };
}

/**
 * The degree of a scale nearest a sung pitch.
 *
 * Searched rather than solved, for the same reason `degreeForStep` searches:
 * a scale's degrees are unevenly spaced, so there is no arithmetic inverse.
 */
export function degreeFor(
    pitch: number,
    tonic: number,
    scale: readonly number[],
    key: number,
): number {
    const semitones = pitch - tonic;
    let best = 1;
    let closest = Infinity;
    for (let degree = -14; degree <= 28; degree++) {
        const distance = Math.abs(
            degreeToSemitones(degree, scale, key) - semitones,
        );
        if (distance < closest) {
            closest = distance;
            best = degree;
        }
    }
    return best;
}

/**
 * Turn a recording into notes.
 *
 * Rests are written where the singer paused, so the rhythm survives — but
 * trailing rests are dropped, since the silence after the last note is when
 * the creator was reaching for the stop button rather than resting.
 */
export default function transcribe(
    frames: readonly Frame[],
): Transcription | undefined {
    const sung = segment(frames);
    if (sung.length === 0) return undefined;

    const tempo = tempoOf(sung);
    const { scale, key } = fit(sung);
    const offsets = Scales[scale];
    const perBeat = 60000 / tempo;
    // The lowest sung note is degree 1, so a hum comes out where it was sung
    // rather than transposed to some absolute pitch.
    const tonic = Math.min(...sung.map((note) => note.pitch));

    const notes: NoteData[] = [];
    let previousEnd = sung[0].at;
    for (const note of sung) {
        const gap = note.at - previousEnd;
        // A silence worth writing down, rounded like any other length.
        const restBeats = Math.round(gap / perBeat);
        if (restBeats >= 1)
            notes.push({ degrees: [], beats: restBeats, volume: 1 });
        notes.push({
            degrees: [degreeFor(note.pitch, tonic, offsets, key)],
            beats: Math.max(1, Math.round(note.ms / perBeat)),
            volume: 1,
        });
        previousEnd = note.at + note.ms;
    }

    return { notes, scale, key, tempo };
}
