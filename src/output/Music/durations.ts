/**
 * Note-duration units: the western note values a creator can write as a unit
 * on a number in a @Track's note list, so `2𝅗𝅥` is a half note without the
 * ceremony of a @Note.
 *
 * **A note value is a fixed number of beats, not a fraction of the track's
 * grid.** A quarter is one beat, always. That is not a new decision: it is
 * what @Track/beat's own documentation already says ("at 0.5beats every entry
 * is an eighth note"), what @Note's says ("a whole note is Note(1 4beats)"),
 * and what the sheet rendering already draws. Anchoring the units anywhere
 * else would make the glyph a creator types disagree with the glyph the sheet
 * draws back. `Track.beat` then plays the part a time signature's denominator
 * plays — it says which written value a bare number is — and can now say so in
 * notation, as `beat: 1𝅘𝅥𝅮`.
 *
 * **The spellings here are NFC, and must stay that way.** All Wordplay source
 * is normalized (see UnicodeString), and Unicode's composition exclusions mean
 * the precomposed note characters U+1D15E–U+1D161 decompose into notehead +
 * combining stem (+ flag) and never recompose. Writing the precomposed form
 * would mean the table no longer matches what the editor stores. Only the
 * whole note, which has no stem, is a single codepoint.
 */

import type Unit from '@nodes/Unit';

/** One writable note value. */
export type NoteDuration = {
    /** The unit name, in NFC — this is what a creator types after the number. */
    readonly unit: string;
    /** How many beats it lasts. */
    readonly beats: number;
};

/** 𝅝 whole note; no stem, so no decomposition. */
export const Whole = '\u{1D15D}';
/** 𝅗𝅥 half note: void notehead + combining stem. */
export const Half = '\u{1D157}\u{1D165}';
/** 𝅘𝅥 quarter note: black notehead + combining stem. */
export const Quarter = '\u{1D158}\u{1D165}';
/** 𝅘𝅥𝅮 eighth note: quarter + one combining flag. */
export const Eighth = '\u{1D158}\u{1D165}\u{1D16E}';
/** 𝅘𝅥𝅯 sixteenth note: quarter + two combining flags. */
export const Sixteenth = '\u{1D158}\u{1D165}\u{1D16F}';
/** 𝅭 combining augmentation dot, which lengthens a value by half. */
export const Dot = '\u{1D16D}';

/** How much longer a dot makes a note. */
export const DotFactor = 1.5;

/** The plain values, longest first. */
export const PlainDurations: readonly NoteDuration[] = [
    { unit: Whole, beats: 4 },
    { unit: Half, beats: 2 },
    { unit: Quarter, beats: 1 },
    { unit: Eighth, beats: 0.5 },
    { unit: Sixteenth, beats: 0.25 },
];

/**
 * Every writable value, each plain one followed by its dotted form, longest
 * first. Dotted values earn their place: a dotted quarter is the whole feel of
 * a 6/8 tune, and without it the gallery's rounds have to spell their long
 * notes out as a note followed by rests.
 */
export const NoteDurations: readonly NoteDuration[] = PlainDurations.flatMap(
    (duration) => [
        duration,
        { unit: duration.unit + Dot, beats: duration.beats * DotFactor },
    ],
);

/**
 * The beats a unit stands for, or undefined if it isn't a note value.
 *
 * Only a single dimension raised to the first power counts: `𝅗𝅥^2` and `𝅗𝅥/s`
 * are arithmetic on a note value rather than a note value, and neither is a
 * duration anyone means to write in a note list.
 */
export function beatsForUnit(unit: Unit): number | undefined {
    if (unit.exponents === undefined || unit.exponents.size !== 1)
        return undefined;
    for (const [name, exponent] of unit.exponents)
        if (exponent === 1)
            return NoteDurations.find((duration) => duration.unit === name)
                ?.beats;
    return undefined;
}

/**
 * The note-value alternatives of a type declaration, like `#𝅝|#𝅝𝅭|…`.
 *
 * Generated rather than written out so the table stays the only place the
 * vocabulary lives; the declarations in Track and Note interpolate this.
 */
export function durationTypes(): string {
    return NoteDurations.map((duration) => `#${duration.unit}`).join('|');
}

/** The type of a note-list entry's number: unitless, or any note value. */
export function degreeType(): string {
    return `#!|${durationTypes()}`;
}
