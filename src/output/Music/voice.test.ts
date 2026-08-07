import { describe, expect, test } from 'vitest';
import {
    Breath,
    ChorusCents,
    SourceHarmonics,
    VibratoDepth,
    glottalHarmonics,
    tuneFirstFormant,
} from '@output/Music/voice';
import { Phonemes } from '@output/Music/phonemes';
import { semitonesToFrequency } from '@output/Music/degrees';

describe('the glottal source', () => {
    test('carries no DC and falls off with harmonic number', () => {
        const { real, imag } = glottalHarmonics();
        expect(real.length).toBe(SourceHarmonics + 1);
        expect(imag.length).toBe(SourceHarmonics + 1);
        // A DC offset would cost headroom and be inaudible.
        expect(imag[0]).toBe(0);
        expect(real.every((value) => value === 0)).toBe(true);
        for (let harmonic = 2; harmonic <= SourceHarmonics; harmonic++)
            expect(imag[harmonic]).toBeLessThan(imag[harmonic - 1]);
        expect(imag[1]).toBe(1);
    });

    test('the caricature knobs stay subtle enough to read as one voice', () => {
        // A wider chorus would read as two singers out of tune rather than as
        // one voice that is not a person; deeper vibrato reads as operatic,
        // which carries an age and a gender.
        expect(ChorusCents).toBeGreaterThan(0);
        expect(ChorusCents).toBeLessThan(15);
        expect(VibratoDepth).toBeLessThan(40);
        // Breathiness is the other classic gender cue, so it stays a whisper.
        expect(Breath).toBeGreaterThan(0);
        expect(Breath).toBeLessThan(0.2);
    });
});

/**
 * Published average formants for adult men and women, by vowel: `[F1, F2]`
 * for each. Every vowel we have a measurement for must land strictly between
 * the two — the first draft of the table did not, and sat at or below the
 * male values for every close and back vowel, which would have made the voice
 * read male on exactly the notes it was supposed to be neutral on.
 */
const Measured: Record<
    string,
    { men: [number, number]; women: [number, number] }
> = {
    i: { men: [342, 2322], women: [437, 2761] },
    ɪ: { men: [427, 2034], women: [483, 2365] },
    e: { men: [476, 2089], women: [536, 2530] },
    ɛ: { men: [580, 1799], women: [731, 2058] },
    æ: { men: [588, 1952], women: [669, 2349] },
    ɑ: { men: [768, 1333], women: [936, 1551] },
    ɔ: { men: [652, 997], women: [781, 1136] },
    o: { men: [497, 910], women: [555, 1035] },
    ʊ: { men: [469, 1122], women: [519, 1225] },
    u: { men: [378, 997], women: [459, 1105] },
    ʌ: { men: [623, 1200], women: [753, 1426] },
    ɝ: { men: [474, 1379], women: [523, 1588] },
};

describe('formant neutrality', () => {
    test('every measured vowel sits between the male and female values', () => {
        // The whole gender-neutrality claim rests on this one property, so it
        // is checked vowel by vowel rather than on an average, which can hide
        // a table that is neutral in the middle and male at the edges.
        for (const [symbol, { men, women }] of Object.entries(Measured)) {
            const vowel = Phonemes.get(symbol);
            expect(vowel, symbol).toBeDefined();
            if (vowel === undefined) continue;
            for (const index of [0, 1]) {
                const ours = vowel.formants[index].hz;
                expect(ours, `${symbol} F${index + 1}`).toBeGreaterThan(
                    men[index],
                );
                expect(ours, `${symbol} F${index + 1}`).toBeLessThan(
                    women[index],
                );
            }
        }
    });

    test('a vowel is the same shape at the bottom and top of the range', () => {
        // The tract must not resize with pitch — that coupling is what a
        // listener hears as body size, and so as gender. `articulate` takes
        // no pitch at all, so the only thing that could break this is F1
        // tuning, and across two octaves of ordinary singing it does nothing.
        const vowel = Phonemes.get('a');
        expect(vowel).toBeDefined();
        if (vowel === undefined) return;
        for (let semitones = -24; semitones <= 0; semitones++)
            expect(
                tuneFirstFormant(
                    vowel.formants[0].hz,
                    semitonesToFrequency(semitones),
                ),
            ).toBe(vowel.formants[0].hz);
    });
});

describe('tuning the first formant', () => {
    test('leaves a formant alone when the note is below it', () => {
        expect(tuneFirstFormant(800, 200)).toBe(800);
    });

    test('raises it to meet a fundamental that has passed it', () => {
        // A formant below f0 has no harmonic to resonate, so the vowel goes
        // hollow; a soprano raises it for the same reason.
        expect(tuneFirstFormant(500, 600)).toBeGreaterThanOrEqual(600);
        expect(tuneFirstFormant(300, 320)).toBeGreaterThanOrEqual(320);
    });

    test('never rises more than a fifth, so the vowel bends rather than changes', () => {
        expect(tuneFirstFormant(300, 4000)).toBe(450);
    });

    test('is monotonic in the note, so a scale never dips in colour', () => {
        let previous = 0;
        for (let hz = 100; hz < 2000; hz += 25) {
            const tuned = tuneFirstFormant(500, hz);
            expect(tuned).toBeGreaterThanOrEqual(previous);
            previous = tuned;
        }
    });
});
