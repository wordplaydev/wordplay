/**
 * The named scales exposed as statics on `Music` (e.g. `🎼.major`), as
 * semitone offsets from the tonic. Degree n of a melody resolves against one
 * of these via `degreeToSemitones`. The modes are rotations of the major
 * scale; the jazz scales were cross-checked against their definitions (bebop
 * dominant is mixolydian plus a natural 7; blues is the minor pentatonic plus
 * a ♭5). Keys here are the en-US names; localized names live in each locale's
 * `output.Music.scales`.
 */
export const ScaleKeys = [
    // Basic
    'major',
    'minor',
    'chromatic',
    // No wrong notes
    'pentatonic',
    'minorPentatonic',
    'blues',
    // The modes (Ionian and Aeolian are major and minor)
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'locrian',
    // Jazz
    'melodicMinor',
    'harmonicMinor',
    'lydianDominant',
    'altered',
    'bebopDominant',
    'bebopMajor',
    'wholeTone',
    'diminished',
] as const;

export type ScaleKey = (typeof ScaleKeys)[number];

export const Scales: Record<ScaleKey, readonly number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    pentatonic: [0, 2, 4, 7, 9],
    minorPentatonic: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    lydianDominant: [0, 2, 4, 6, 7, 9, 10],
    altered: [0, 1, 3, 4, 6, 8, 10],
    bebopDominant: [0, 2, 4, 5, 7, 9, 10, 11],
    bebopMajor: [0, 2, 4, 5, 7, 8, 9, 11],
    wholeTone: [0, 2, 4, 6, 8, 10],
    diminished: [0, 1, 3, 4, 6, 7, 9, 10],
};
