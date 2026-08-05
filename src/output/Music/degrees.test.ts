import { expect, test } from 'vitest';
import {
    DegreeEpsilon,
    degreeToSemitones,
    degreeVoices,
} from '@output/Music/degrees';
import { Scales } from '@output/Music/scales';

const major = Scales.major;

test('a whole degree is one voice at full volume, mashed or not', () => {
    for (const mash of [true, false])
        for (const degree of [1, 3, 8, 0, -6]) {
            const voices = degreeVoices(degree, major, 0, mash);
            expect(voices).toHaveLength(1);
            expect(voices[0].degree).toBe(degree);
            expect(voices[0].weight).toBe(1);
            expect(voices[0].semitones).toBe(
                degreeToSemitones(degree, major, 0),
            );
        }
});

test('a mashed fraction sounds both neighbors, the nearer one louder', () => {
    const voices = degreeVoices(1.2, major, 0, true);
    expect(voices.map((voice) => voice.degree)).toEqual([1, 2]);
    expect(voices.map((voice) => voice.semitones)).toEqual([0, 2]);
    expect(voices[0].weight).toBeGreaterThan(voices[1].weight);
});

test('a mashed pair keeps constant power, so a run does not dip', () => {
    // Linear weights would sum to 0.707 of a whole note's power at the
    // midpoint, which is an audible dip on every fraction of a run.
    for (const degree of [1.1, 1.5, 3.75, 6.4]) {
        const power = degreeVoices(degree, major, 0, true).reduce(
            (total, voice) => total + voice.weight * voice.weight,
            0,
        );
        expect(power).toBeCloseTo(1, 10);
    }
});

test('a negative fraction leans on the neighbor it is nearer', () => {
    // −1.2 is between −2 and −1, and closer to −1.
    const voices = degreeVoices(-1.2, major, 0, true);
    expect(voices.map((voice) => voice.degree)).toEqual([-2, -1]);
    expect(voices[1].weight).toBeGreaterThan(voices[0].weight);
});

test('a degree a hair off whole is one voice, not two', () => {
    // Degrees are usually computed, so a rounding error must not double the
    // voice count for a partner nobody can hear.
    for (const degree of [1 + DegreeEpsilon / 10, 2 - DegreeEpsilon / 10]) {
        const voices = degreeVoices(degree, major, 0, true);
        expect(voices).toHaveLength(1);
        expect(voices[0].weight).toBe(1);
    }
});

test('an unmashed fraction is one note bent between its neighbors', () => {
    const voices = degreeVoices(1.2, major, 0, false);
    expect(voices).toHaveLength(1);
    expect(voices[0].weight).toBe(1);
    // Two fifths of the way from degree 1 (0 semitones) to degree 2 (2).
    expect(voices[0].semitones).toBeCloseTo(0.4, 10);
    // A whole degree even so, since a kit indexes its kit by degree.
    expect(Number.isInteger(voices[0].degree)).toBe(true);
    expect(voices[0].degree).toBe(1);
});

test('an unmashed fraction rounds its degree to the nearer kit piece', () => {
    expect(degreeVoices(1.8, major, 0, false)[0].degree).toBe(2);
    expect(degreeVoices(1.2, major, 0, false)[0].degree).toBe(1);
});

test('no degree ever resolves to a pitch that is not a number', () => {
    // The bug this replaced: `scale[0.2]` is undefined, so the semitones were
    // NaN, and assigning NaN to an AudioParam throws — killing the rest of the
    // scheduling window rather than just the note.
    for (const degree of [1.2, 1.5, 3.5, 8.5, -1.2, 0.5, 0.001])
        for (const scale of [major, Scales.pentatonic, Scales.chromatic]) {
            expect(Number.isFinite(degreeToSemitones(degree, scale, 0))).toBe(
                true,
            );
            for (const mash of [true, false])
                for (const voice of degreeVoices(degree, scale, 0, mash))
                    expect(Number.isFinite(voice.semitones)).toBe(true);
        }
});

test('an interpolated pitch stays between its neighbors', () => {
    for (const degree of [1.25, 4.5, 7.9]) {
        const low = degreeToSemitones(Math.floor(degree), major, 0);
        const high = degreeToSemitones(Math.floor(degree) + 1, major, 0);
        const between = degreeToSemitones(degree, major, 0);
        expect(between).toBeGreaterThan(low);
        expect(between).toBeLessThan(high);
    }
});

test('an empty scale still resolves, fractions included', () => {
    expect(degreeToSemitones(1.5, [], 3)).toBe(3);
    expect(degreeVoices(1.5, [], 3, true).every((v) => v.semitones === 3)).toBe(
        true,
    );
});
