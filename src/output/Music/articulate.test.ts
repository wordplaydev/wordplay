import { describe, expect, test } from 'vitest';
import { articulate, assignWords } from '@output/Music/articulate';

/** Notes, written as the degrees they sound; an empty list is a rest. */
function notes(...degrees: number[][]) {
    return degrees.map((d) => ({ degrees: d }));
}

describe('handing syllables to notes', () => {
    test('no words means no syllables anywhere', () => {
        expect(assignWords(undefined, notes([1], [2]))).toEqual([
            undefined,
            undefined,
        ]);
        expect(assignWords('   ', notes([1], [2]))).toEqual([
            undefined,
            undefined,
        ]);
    });

    test('one syllable per sounding note, in order', () => {
        expect(assignWords('la mi so', notes([1], [2], [3]))).toEqual([
            'la',
            'mi',
            'so',
        ]);
    });

    test('a rest sings nothing and consumes nothing', () => {
        // The syllable after the rest must be the next one written, not the
        // one the rest would have eaten.
        expect(assignWords('la mi', notes([1], [], [2]))).toEqual([
            'la',
            undefined,
            'mi',
        ]);
    });

    test('the words repeat when they run out', () => {
        expect(assignWords('la mi', notes([1], [2], [3], [4], [5]))).toEqual([
            'la',
            'mi',
            'la',
            'mi',
            'la',
        ]);
    });

    test('a trailing dash holds the syllable across the next note', () => {
        expect(assignWords('la- mi', notes([1], [2], [3]))).toEqual([
            'la',
            'la',
            'mi',
        ]);
    });

    test('each dash adds one more note to the melisma', () => {
        expect(assignWords('la-- mi', notes([1], [2], [3], [4]))).toEqual([
            'la',
            'la',
            'la',
            'mi',
        ]);
    });

    test('a melisma counts sounding notes, skipping rests inside it', () => {
        expect(assignWords('la- mi', notes([1], [], [2], [3]))).toEqual([
            'la',
            undefined,
            'la',
            'mi',
        ]);
    });

    test('a chord is one note and takes one syllable', () => {
        expect(assignWords('la mi', notes([1, 3, 5], [2]))).toEqual([
            'la',
            'mi',
        ]);
    });

    test('a bare dash is not a syllable', () => {
        expect(assignWords('- la', notes([1], [2]))).toEqual(['la', 'la']);
    });
});

describe('laying a syllable across a note', () => {
    /** Segments must tile the note exactly, with no gaps and no overrun —
     * anything else is either silence the creator did not write or a note
     * that outlasts its own envelope. */
    function tiles(words: string | undefined, seconds: number) {
        const segments = articulate(words, seconds);
        expect(segments.length).toBeGreaterThan(0);
        expect(segments[0].at).toBe(0);
        segments.forEach((segment, index) => {
            expect(segment.seconds).toBeGreaterThan(0);
            const next = segments[index + 1];
            if (next !== undefined)
                expect(next.at).toBeCloseTo(segment.at + segment.seconds, 6);
        });
        const last = segments[segments.length - 1];
        expect(last.at + last.seconds).toBeCloseTo(seconds, 6);
        return segments;
    }

    test('a note with no words still sings', () => {
        // Falling silent on an unwritten lyric would be indistinguishable
        // from a broken instrument.
        const segments = tiles(undefined, 0.5);
        expect(segments).toHaveLength(1);
        expect(segments[0].voiced).toBe(true);
    });

    test('an unrecognizable lyric still sings', () => {
        expect(tiles('???', 0.5)).toHaveLength(1);
    });

    test('a long note is a long vowel, not a slow word', () => {
        const short = tiles('la', 0.4);
        const long = tiles('la', 2);
        // The l takes the same time in both; only the vowel grows.
        expect(long[0].seconds).toBeCloseTo(short[0].seconds, 6);
        expect(long[1].seconds).toBeGreaterThan(short[1].seconds * 3);
    });

    test('the vowels share whatever the consonants leave', () => {
        const segments = tiles('lala', 1);
        const vowels = segments.filter((segment) => segment.seconds > 0.2);
        expect(vowels).toHaveLength(2);
        expect(vowels[0].seconds).toBeCloseTo(vowels[1].seconds, 6);
    });

    test('a stop is silence and then a burst', () => {
        const [closure, burst] = tiles('ta', 0.6);
        expect(closure.gain).toBe(0);
        expect(burst.gain).toBeGreaterThan(0);
        expect(burst.noise).toBe(1);
        // A burst arrives; it does not glide into place.
        expect(burst.glide).toBeLessThan(closure.glide + 0.01);
    });

    test('a voiceless stop breathes after its burst and a voiced one does not', () => {
        const breathed = articulate('ta', 0.6).filter(
            (segment) => segment.noise === 1 && !segment.voiced,
        );
        expect(breathed.length).toBeGreaterThan(1);
        // Nothing in a voiced stop is unvoiced, closure included — the folds
        // keep working through it, which is the whole difference from a t.
        expect(
            articulate('da', 0.6).filter((segment) => !segment.voiced),
        ).toHaveLength(0);
    });

    test('a syllable with no vowel is held by whatever can be held', () => {
        // Humming an m is ordinary; it must not click and stop.
        const segments = tiles('m', 1);
        expect(segments).toHaveLength(1);
        expect(segments[0].seconds).toBeCloseTo(1, 6);
    });

    test('a note too short for its consonants compresses rather than truncates', () => {
        // Losing the end of a word would be worse than hearing all of it fast.
        const segments = tiles('stra', 0.08);
        expect(segments.length).toBeGreaterThan(3);
    });

    test('stress makes a syllable louder without changing its sounds', () => {
        const plain = articulate('la', 0.5);
        const stressed = articulate('ˈla', 0.5);
        expect(stressed).toHaveLength(plain.length);
        expect(Math.abs(stressed[1].gain)).toBeGreaterThan(
            Math.abs(plain[1].gain),
        );
    });

    test('a trill beats and a vowel does not', () => {
        expect(
            articulate('ra', 0.5).some((segment) => segment.flutter > 0),
        ).toBe(true);
        expect(
            articulate('la', 0.5).every((segment) => segment.flutter === 0),
        ).toBe(true);
    });

    test('a nasal carries its zero and the vowel after it does not', () => {
        const [nasal, vowel] = articulate('ma', 0.5);
        expect(nasal.antiformant).toBeDefined();
        expect(vowel.antiformant).toBeUndefined();
    });

    test('the shortest possible note still produces a segment', () => {
        tiles('stra', 0.02);
        tiles('a', 0.02);
    });
});
