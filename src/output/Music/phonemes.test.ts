import { describe, expect, test } from 'vitest';
import {
    Phonemes,
    canSustain,
    neutralVowel,
    toSyllable,
} from '@output/Music/phonemes';

/** Every IPA symbol the table claims, so a bad edit to one entry fails here
 * rather than being noticed as a phoneme that stopped making a sound. */
const Vowels = 'iyɨʉɯuɪʏʊeøɘɵɤoəɛœɜɞʌɔæɐaɶɑɒɚɝ';
const Consonants =
    'mɱnɳɲŋɴlɫɭʎʟɹɻɰjwɥʋɸβfvθðszʃʒʂʐɕʑçʝxɣχʁħʕɬɮhɦpbtdʈɖcɟkɡqɢʔɓɗʄɠʛʘǀǃǂǁrʀʙɾɽ';

describe('the phoneme table', () => {
    test('covers every symbol it claims, with no duplicates', () => {
        const symbols = [...Vowels, ...Consonants];
        for (const symbol of symbols)
            expect(Phonemes.get(symbol), symbol).toBeDefined();
        expect(new Set(symbols).size).toBe(symbols.length);
        expect(Phonemes.size).toBe(symbols.length);
    });

    test('every entry reports the symbol it is filed under', () => {
        for (const [symbol, phoneme] of Phonemes)
            expect(phoneme.ipa).toBe(symbol);
    });

    test('formants ascend, are audible, and have positive bandwidths', () => {
        for (const [symbol, phoneme] of Phonemes) {
            const [f1, f2, f3, f4] = phoneme.formants;
            expect(f1.hz, symbol).toBeGreaterThan(100);
            expect(f2.hz, symbol).toBeGreaterThan(f1.hz);
            expect(f3.hz, symbol).toBeGreaterThan(f2.hz);
            expect(f4.hz, symbol).toBeGreaterThan(f3.hz);
            // Beyond this the bank is filtering nothing a listener can hear.
            expect(f4.hz, symbol).toBeLessThan(12000);
            for (const formant of phoneme.formants)
                expect(formant.bw, symbol).toBeGreaterThan(0);
        }
    });

    test('adjacent formants alternate in sign, so they cannot cancel', () => {
        for (const [symbol, phoneme] of Phonemes) {
            // Fricatives, stops, and clicks weight their bands as one plateau
            // rather than as peaks, so the rule is a vowel-shape one.
            if (phoneme.manner !== 'vowel' && phoneme.manner !== 'nasal')
                continue;
            const signs = phoneme.formants.map((formant) =>
                Math.sign(formant.gain),
            );
            expect(signs, symbol).toEqual([1, -1, 1, -1]);
        }
    });

    test('durations and mixes stay in range', () => {
        for (const [symbol, phoneme] of Phonemes) {
            expect(phoneme.noise, symbol).toBeGreaterThanOrEqual(0);
            expect(phoneme.noise, symbol).toBeLessThanOrEqual(1);
            expect(phoneme.gain, symbol).toBeGreaterThanOrEqual(0);
            expect(phoneme.closure, symbol).toBeGreaterThanOrEqual(0);
            if (phoneme.seconds !== 'sustain')
                expect(phoneme.seconds, symbol).toBeGreaterThan(0);
        }
    });

    test('only vowels sustain, and only stops and clicks cannot be held', () => {
        for (const [symbol, phoneme] of Phonemes) {
            expect(phoneme.seconds === 'sustain', symbol).toBe(
                phoneme.manner === 'vowel',
            );
            expect(canSustain(phoneme), symbol).toBe(
                phoneme.manner !== 'plosive' && phoneme.manner !== 'click',
            );
        }
    });

    test("the r's third formant is far below every other sound's", () => {
        // The one number that makes an English r an r; a table edit that
        // raised it would leave it sounding like a w.
        const r = Phonemes.get('ɹ');
        expect(r?.formants[2].hz).toBeLessThan(1800);
    });

    test('a nasal has a zero and a vowel does not', () => {
        expect(Phonemes.get('m')?.antiformant).toBeDefined();
        expect(Phonemes.get('n')?.antiformant?.hz).toBeGreaterThan(
            Phonemes.get('m')?.antiformant?.hz ?? 0,
        );
        expect(Phonemes.get('a')?.antiformant).toBeUndefined();
    });

    test('a voiceless fricative is all noise and its voiced twin is not', () => {
        expect(Phonemes.get('s')?.noise).toBe(1);
        expect(Phonemes.get('s')?.voiced).toBe(false);
        expect(Phonemes.get('z')?.voiced).toBe(true);
        expect(Phonemes.get('z')?.noise).toBeLessThan(1);
    });

    test('the neutral vowel is the schwa', () => {
        expect(neutralVowel().ipa).toBe('ə');
    });

    test('levels are ordered the way speech orders them', () => {
        // A cheap guard on the balance that `scripts/instruments/voiceGain.ts`
        // measures properly: if a table edit ever puts a sibilant above a
        // vowel again, every lyric lurches at its consonants.
        const of = (symbol: string) => Phonemes.get(symbol)?.gain ?? 0;
        expect(of('a')).toBeGreaterThan(of('i'));
        expect(of('i')).toBeGreaterThan(of('l'));
        expect(of('l')).toBeGreaterThan(of('s'));
        expect(of('s')).toBeGreaterThan(of('m'));
        expect(of('s')).toBeGreaterThan(of('f'));
        expect(of('ʃ')).toBeGreaterThan(of('θ'));
        for (const [symbol, phoneme] of Phonemes)
            expect(phoneme.gain, symbol).toBeLessThanOrEqual(1);
    });

    test('an open vowel is louder than a close one, as a wider mouth is', () => {
        const open = Phonemes.get('a');
        const close = Phonemes.get('u');
        expect(open?.gain).toBeGreaterThan(close?.gain ?? 0);
    });

    test('every shape carries the same power, so gain means something', () => {
        // The property that makes `gain` a level control rather than a number
        // whose effect depends on how wide the phoneme's bands happen to be.
        const power = (symbol: string) => {
            const phoneme = Phonemes.get(symbol);
            if (phoneme === undefined) return 0;
            return phoneme.formants.reduce(
                (total, formant) => total + formant.gain ** 2 * formant.bw,
                0,
            );
        };
        const vowel = power('a');
        for (const symbol of ['a', 'i', 'm', 's', 'ʃ', 'k', 'l', 'r'])
            expect(power(symbol), symbol).toBeCloseTo(vowel, 5);
    });
});

describe('reading IPA', () => {
    test('reads a plain syllable in order', () => {
        expect(toSyllable('la').phonemes.map((p) => p.ipa)).toEqual(['l', 'a']);
    });

    test('skips what it does not recognize rather than falling silent', () => {
        // Silence would be indistinguishable from a broken instrument, so an
        // unknown letter costs its own sound and nothing else.
        expect(toSyllable('l?a!').phonemes.map((p) => p.ipa)).toEqual([
            'l',
            'a',
        ]);
        expect(toSyllable('????').phonemes).toHaveLength(0);
    });

    test('a tie bar joins an affricate without adding a sound', () => {
        expect(toSyllable('t͡ʃa').phonemes.map((p) => p.ipa)).toEqual([
            't',
            'ʃ',
            'a',
        ]);
    });

    test('stress raises the syllable rather than adding a phoneme', () => {
        const stressed = toSyllable('ˈla');
        expect(stressed.phonemes.map((p) => p.ipa)).toEqual(['l', 'a']);
        expect(stressed.stress).toBeGreaterThan(toSyllable('la').stress);
        expect(toSyllable('ˌla').stress).toBeLessThan(stressed.stress);
    });

    test('length doubles the sound before it', () => {
        const [held] = toSyllable('sː').phonemes;
        const [plain] = toSyllable('s').phonemes;
        // The mark modifies rather than adds, so this is still one phoneme.
        expect(toSyllable('sː').phonemes).toHaveLength(1);
        expect(plain.seconds).not.toBe('sustain');
        expect(held.seconds).toBe(
            plain.seconds === 'sustain' ? 'sustain' : plain.seconds * 2,
        );
    });

    test('lengthening a vowel leaves it sustaining, since it already fills', () => {
        expect(toSyllable('aː').phonemes[0].seconds).toBe('sustain');
    });

    test('nasalizing adds a zero, and devoicing turns the source to noise', () => {
        expect(toSyllable('ã').phonemes[0].antiformant).toBeDefined();
        const devoiced = toSyllable('ḁ').phonemes[0];
        expect(devoiced.voiced).toBe(false);
        expect(devoiced.noise).toBe(1);
    });

    test('labializing lowers the upper formants and leaves F1 alone', () => {
        const plain = toSyllable('k').phonemes[0];
        const rounded = toSyllable('kʷ').phonemes[0];
        expect(rounded.formants[0].hz).toBe(plain.formants[0].hz);
        expect(rounded.formants[1].hz).toBeLessThan(plain.formants[1].hz);
    });

    test('an ejective adds a glottal stop rather than changing the stop', () => {
        expect(toSyllable('kʼa').phonemes.map((p) => p.ipa)).toEqual([
            'k',
            'ʔ',
            'a',
        ]);
    });

    test('a modifier with nothing before it is simply dropped', () => {
        expect(toSyllable('ːa').phonemes.map((p) => p.ipa)).toEqual(['a']);
    });

    test('modifying never mutates the shared table entry', () => {
        const before = Phonemes.get('a')?.antiformant;
        toSyllable('ã');
        expect(Phonemes.get('a')?.antiformant).toBe(before);
        expect(Phonemes.get('a')?.antiformant).toBeUndefined();
    });
});
