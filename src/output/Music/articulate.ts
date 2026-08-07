/**
 * Two pure steps between a written lyric and a sounding note: which syllable
 * each note gets, and what the vocal tract does during it.
 *
 * Both are here rather than in `MusicAudio` because both are decisions, and
 * this codebase keeps decisions testable — `MusicAudio` receives a finished
 * list of timed targets and does nothing but write them onto `AudioParam`s.
 */

import {
    canSustain,
    neutralVowel,
    toSyllable,
    type Formant,
    type Phoneme,
} from '@output/Music/phonemes';
import { GlideSeconds, OnsetSeconds } from '@output/Music/voice';

/** A note's worth of a track's notes, as much as word assignment needs. */
export type Sounding = { degrees: readonly number[] };

/**
 * One steady state of the vocal tract, and how long it holds.
 *
 * Segments tile the note exactly: the first starts at 0 and the last ends at
 * the note's duration, with no gaps. A silence is a segment with `gain` 0
 * rather than an absence, since a stop's closure is an audible event.
 */
export type Segment = {
    /** Seconds from the note's start. */
    at: number;
    seconds: number;
    formants: readonly [Formant, Formant, Formant, Formant];
    antiformant: { hz: number; bw: number } | undefined;
    /** How much of the source is noise rather than glottal pulse, 0–1. */
    noise: number;
    voiced: boolean;
    gain: number;
    /** Amplitude modulation in Hz, for a trill. */
    flutter: number;
    /** Seconds the formants take to arrive here from the previous segment. */
    glide: number;
    /**
     * Seconds this segment's *level* takes to arrive.
     *
     * Separate from `glide` because a consonant is loud before the tract has
     * finished moving — and because a burst is 12ms long. Smoothing its level
     * over the 8ms that suits a vowel meant every stop was a slow swell, cut
     * off before it reached full amplitude: no transient, and a `p` that
     * sounded like blowing rather than popping.
     */
    ramp: number;
};

/** The shortest a held vowel is allowed to be squeezed to, so a fast note
 * full of consonants still has a voice in it somewhere. */
const MinVowel = 0.03;

/** A burst arrives rather than glides; anything else would smear the very
 * transient that makes a stop a stop. */
const BurstGlide = 0.002;

/** How long a level takes to arrive. The slow one is short enough to be an
 * edge and long enough not to click; the abrupt one is as fast as a gain can
 * move without clicking, because for a burst the edge *is* the sound. */
const LevelRamp = 0.008;
const BurstRamp = 0.001;

/**
 * Which syllable each note sings, in note order — `undefined` for a rest, and
 * for every note when there are no words.
 *
 * **The words repeat when they run out.** A track loops its notes by default,
 * so a lyric that stopped would leave the melody wordless on its second time
 * around; repeating means a one-line lyric over a four-line tune does the
 * obvious thing rather than the surprising one.
 *
 * A syllable ending in `-` is held across the next sounding note as well, one
 * extra note per `-`. That is how a melisma is written, and it is the only
 * punctuation this understands.
 */
export function assignWords(
    words: string | undefined,
    notes: readonly Sounding[],
): (string | undefined)[] {
    const syllables = toSyllables(words);
    if (syllables.length === 0) return notes.map(() => undefined);
    let index = 0;
    let covered = 0;
    return notes.map((note) => {
        // A rest sings nothing and consumes nothing.
        if (note.degrees.length === 0) return undefined;
        const current = syllables[index % syllables.length];
        covered = covered + 1;
        if (covered >= current.notes) {
            index = index + 1;
            covered = 0;
        }
        return current.syllable;
    });
}

/** A syllable and how many notes it covers. */
function toSyllables(
    words: string | undefined,
): { syllable: string; notes: number }[] {
    if (words === undefined) return [];
    const syllables: { syllable: string; notes: number }[] = [];
    for (const token of words.split(/\s+/)) {
        let syllable = token;
        let notes = 1;
        while (syllable.endsWith('-')) {
            syllable = syllable.slice(0, -1);
            notes = notes + 1;
        }
        if (syllable.length > 0) syllables.push({ syllable, notes });
    }
    return syllables;
}

/**
 * What the tract does over one note: a syllable's phonemes laid out across
 * the seconds available.
 *
 * Consonants take the time they take — a stop's closure and burst are the
 * same length in a fast passage as a slow one, because that is what makes
 * them read as consonants rather than as short vowels. Whatever is left over
 * goes to the vowels, which is why a long note is a long *vowel* and not a
 * slow-motion word. If a note is too short even for its consonants, the whole
 * syllable is compressed proportionally rather than truncated, so the last
 * sound of a word is never simply missing.
 */
export function articulate(
    words: string | undefined,
    seconds: number,
): Segment[] {
    const { phonemes, stress } = toSyllable(words ?? '');
    // No lyric, or nothing recognizable in it, still sings — an instrument
    // that falls silent when it doesn't understand you reads as broken.
    const sounds = phonemes.length > 0 ? phonemes : [neutralVowel()];

    // What the consonants claim before the vowels get anything.
    let fixed = 0;
    for (const sound of sounds)
        fixed =
            fixed +
            sound.closure +
            sound.aspiration +
            (sound.seconds === 'sustain' ? 0 : sound.seconds);

    // Whoever holds the note: the vowels, or failing that the last sound that
    // can be held at all, so a lyric of `m` hums rather than clicking.
    const holders = sounds.filter((sound) => sound.seconds === 'sustain');
    if (holders.length === 0) {
        const last = [...sounds].reverse().find(canSustain);
        if (last !== undefined) holders.push(last);
    }

    const held = Math.max(seconds - fixed, MinVowel * holders.length);
    const each = holders.length > 0 ? held / holders.length : 0;
    // Compressing rather than truncating: a note too short for its own
    // consonants speeds them all up instead of losing the end of the word.
    const squeeze = Math.min(1, seconds / Math.max(fixed + held, 0.001));

    const segments: Segment[] = [];
    let at = 0;
    const add = (
        sound: Phoneme,
        length: number,
        options: {
            silent?: boolean;
            breathed?: boolean;
            abrupt?: boolean;
        } = {},
    ) => {
        if (length <= 0) return;
        segments.push({
            at,
            seconds: length,
            formants: sound.formants,
            antiformant: sound.antiformant,
            noise: options.breathed === true ? 1 : sound.noise,
            voiced: options.breathed === true ? false : sound.voiced,
            gain:
                options.silent === true
                    ? 0
                    : sound.gain *
                      stress *
                      (options.breathed === true ? 0.5 : 1),
            flutter: sound.flutter,
            glide:
                segments.length === 0
                    ? OnsetSeconds
                    : options.abrupt === true
                      ? BurstGlide
                      : GlideSeconds,
            ramp: options.abrupt === true ? BurstRamp : LevelRamp,
        });
        at = at + length;
    };

    for (const sound of sounds) {
        const abrupt = sound.manner === 'plosive' || sound.manner === 'click';
        // Silence while the closure holds. The formants are already the
        // stop's locus, so the tract is quietly moving into place during it —
        // which is what makes the burst land somewhere rather than nowhere.
        add(sound, sound.closure * squeeze, { silent: true, abrupt });
        const body =
            sound.seconds === 'sustain'
                ? each * squeeze
                : sound.seconds * squeeze;
        add(sound, body, { abrupt });
        add(sound, sound.aspiration * squeeze, { breathed: true });
    }

    // Floating-point drift over a dozen segments would leave the note a few
    // microseconds short of its own length; the last segment absorbs it.
    const last = segments[segments.length - 1];
    if (last !== undefined) last.seconds = Math.max(seconds - last.at, 0.001);

    return segments;
}
