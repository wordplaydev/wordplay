/**
 * Pure scale-degree math shared by the language surface, the player, and the
 * visualizations. Degrees are 1-indexed: 1 is the tonic, 8 the tonic an
 * octave up in a 7-note scale. Degrees at or below 0 are reachable only
 * through arithmetic and must wrap downward, which Wordplay list indexing
 * cannot express (lists wrap upward only; index 0 is ø and negatives wrap to
 * the end), hence the floored modulo here.
 */

/** Resolve a scale degree to semitones above the tonic, shifted by `key`. */
export function degreeToSemitones(
    degree: number,
    scale: readonly number[],
    key = 0,
): number {
    if (scale.length === 0) return key;
    const zeroBased = degree - 1;
    const length = scale.length;
    const index = ((zeroBased % length) + length) % length;
    const octave = Math.floor(zeroBased / length);
    return scale[index] + 12 * octave + key;
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
