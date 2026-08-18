/**
 * Pure scale-degree math shared by the language surface, the player, and the
 * visualizations. Degrees are 1-indexed: 1 is the tonic, 8 the tonic an
 * octave up in a 7-note scale. Degrees at or below 0 are reachable only
 * through arithmetic and must wrap downward, which Wordplay list indexing
 * cannot express (lists wrap upward only; index 0 is ø and negatives wrap to
 * the end), hence the floored modulo here.
 *
 * Degrees need not be whole. A fraction sits between two scale degrees, and
 * `degreeVoices` says what that sounds like — either both neighbors at once
 * or one note bent off pitch, depending on the track's `mash`.
 */

/**
 * How close to a whole degree still counts as whole.
 *
 * Degrees are usually computed rather than written — `n + 0.1 · 3` lands a
 * hair off 1.3 — and without a tolerance every such note would spawn a second
 * voice at inaudible gain, doubling the voice count for nothing.
 */
export const DegreeEpsilon = 0.001;

/** The semitones of a whole degree, without the fractional handling below. */
function wholeDegreeToSemitones(
    degree: number,
    scale: readonly number[],
    key: number,
): number {
    const zeroBased = degree - 1;
    const length = scale.length;
    const index = ((zeroBased % length) + length) % length;
    const octave = Math.floor(zeroBased / length);
    return scale[index] + 12 * octave + key;
}

/** The whole degrees a possibly-fractional degree sits between, and how far
 *  between them it sits. `fraction` is 0 when the degree is already whole. */
function neighbors(degree: number): {
    lower: number;
    upper: number;
    fraction: number;
} {
    const lower = Math.floor(degree);
    const fraction = degree - lower;
    // Snap the near-whole cases so a rounding error can't produce a second
    // voice, and so `upper` is never a degree the note isn't really near.
    if (fraction < DegreeEpsilon) return { lower, upper: lower, fraction: 0 };
    if (fraction > 1 - DegreeEpsilon)
        return { lower: lower + 1, upper: lower + 1, fraction: 0 };
    return { lower, upper: lower + 1, fraction };
}

/**
 * Resolve a scale degree to semitones above the tonic, shifted by `key`.
 *
 * A fractional degree resolves to the interpolated pitch between its
 * neighbors, which is what it means as a *pitch* whether or not it will sound
 * as one note or two. Interpolating rather than indexing is also what keeps
 * this total: `scale[0.2]` is `undefined`, and the `NaN` that produced reached
 * the audio clock and threw, taking the rest of the scheduling window with it.
 */
export function degreeToSemitones(
    degree: number,
    scale: readonly number[],
    key = 0,
): number {
    if (scale.length === 0) return key;
    const { lower, upper, fraction } = neighbors(degree);
    const low = wholeDegreeToSemitones(lower, scale, key);
    if (fraction === 0) return low;
    const high = wholeDegreeToSemitones(upper, scale, key);
    return low + (high - low) * fraction;
}

/** One sounding voice a degree resolves to. */
export type DegreeVoice = {
    /** The whole degree this voice plays; kits index their kit with it. */
    degree: number;
    /** Semitones above the tonic; fractional only for a bent note. */
    semitones: number;
    /** 0-1 gain multiplier for this voice alone. */
    weight: number;
};

/**
 * What a degree actually sounds as: one voice for a whole degree, and for a
 * fraction either both neighbors at once or one note bent between them.
 *
 * Mashing weights the pair on an equal-power curve rather than linearly.
 * Two different pitches sum incoherently, so 0.5/0.5 at the midpoint would
 * land about 3dB under a whole note, and a run like `1 1.5 2 2.5` would dip
 * audibly on every fraction; cosine and sine keep the pair's total power at 1
 * all the way across.
 *
 * Every voice carries a *whole* degree even when the pitch is bent, so
 * unpitched instruments — which index their kit by degree rather than
 * transposing — always have an integer to index with.
 */
export function degreeVoices(
    degree: number,
    scale: readonly number[],
    key: number,
    mash: boolean,
): DegreeVoice[] {
    const { lower, upper, fraction } = neighbors(degree);
    if (fraction === 0)
        return [
            {
                degree: lower,
                semitones: degreeToSemitones(lower, scale, key),
                weight: 1,
            },
        ];
    if (!mash)
        return [
            {
                // The nearer neighbor, so a kit picks the piece the note is
                // closest to rather than always the one below it.
                degree: Math.round(degree),
                semitones: degreeToSemitones(degree, scale, key),
                weight: 1,
            },
        ];
    return [
        {
            degree: lower,
            semitones: degreeToSemitones(lower, scale, key),
            weight: Math.cos((fraction * Math.PI) / 2),
        },
        {
            degree: upper,
            semitones: degreeToSemitones(upper, scale, key),
            weight: Math.sin((fraction * Math.PI) / 2),
        },
    ];
}

/** Middle C, the pitch of degree 1 at key 0 in every scale. */
export const TonicHz = 261.6256;

/** Equal-temperament frequency for a semitone offset from the tonic. */
export function semitonesToFrequency(
    semitones: number,
    tonic = TonicHz,
): number {
    return tonic * Math.pow(2, semitones / 12);
}
