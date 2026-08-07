import { describe, expect, test } from 'vitest';
import { sing } from './voiceGain';
import { Phonemes } from '../../src/output/Music/phonemes';
import { articulate } from '../../src/output/Music/articulate';

/**
 * The end-to-end check on the vocal synthesizer: that a vowel written in the
 * table comes out of the whole chain — parser, articulation, source, filter
 * bank — with its formants where the table put them.
 *
 * Every other test is on one link of that chain. This one renders through the
 * offline twin `voiceGain.ts` uses for its loudness calibration and looks at
 * the spectrum, which is the only way to catch a bug that leaves each part
 * correct and the sound wrong — an amplitude with the wrong sign, a Q computed
 * upside down, a segment that never reaches its target.
 */

/**
 * Magnitude at one frequency, averaged over Hann-windowed blocks.
 *
 * Blocked rather than run over the whole buffer because Goertzel's recurrence
 * sits on the unit circle and is only marginally stable: over the 40,000
 * samples of a held note the rounding error swamps the answer, and the first
 * version of this test "found" the same three peaks in every vowel.
 */
function magnitudeAt(
    samples: Float32Array,
    rate: number,
    frequency: number,
    block = 4096,
): number {
    const w = (2 * Math.PI * frequency) / rate;
    const coefficient = 2 * Math.cos(w);
    let total = 0;
    let blocks = 0;
    // Skip the onset, which is a glide rather than the target.
    for (
        let start = Math.round(rate * 0.15);
        start + block <= samples.length;
        start += block
    ) {
        let s1 = 0;
        let s2 = 0;
        for (let index = 0; index < block; index++) {
            const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / block);
            const s = samples[start + index] * hann + coefficient * s1 - s2;
            s2 = s1;
            s1 = s;
        }
        total += Math.sqrt(
            Math.max(0, s1 * s1 + s2 * s2 - coefficient * s1 * s2),
        );
        blocks += 1;
    }
    return blocks === 0 ? 0 : total / blocks;
}

/** The strongest frequency in a band, probed every 10 Hz. */
function peakBetween(
    audio: { samples: Float32Array; rate: number },
    low: number,
    high: number,
): number {
    let best = low;
    let strongest = -1;
    for (let hz = low; hz <= high; hz += 10) {
        const magnitude = magnitudeAt(audio.samples, audio.rate, hz);
        if (magnitude > strongest) {
            strongest = magnitude;
            best = hz;
        }
    }
    return best;
}

/** A low note, so the harmonics are close enough together to resolve a
 * formant between them. */
const Fundamental = 110;

/**
 * A resonance can only be located to within the spacing of the harmonics
 * exciting it — a formant between two of them shows up at whichever is
 * nearer, which is what a real voice does too. So the tolerance is a
 * proportion or one harmonic, whichever is looser.
 */
function near(found: number, wanted: number): boolean {
    return Math.abs(found - wanted) <= Math.max(wanted * 0.15, Fundamental);
}

describe('a rendered vowel has its formants where the table says', () => {
    for (const symbol of ['a', 'i', 'u', 'ɛ', 'o']) {
        test(`${symbol} resonates at its own F1 and F2`, () => {
            const vowel = Phonemes.get(symbol);
            expect(vowel, symbol).toBeDefined();
            if (vowel === undefined) return;
            const audio = sing(symbol, Fundamental, 0.9);
            const [f1, f2] = vowel.formants;
            // The band each formant is hunted in is split at the geometric
            // mean of the two, rather than at a fixed frequency: a back vowel
            // like `o` puts F2 down at 975Hz, below where any one boundary
            // that suits `i` could sit, and the search could never reach it.
            const between = Math.sqrt(f1.hz * f2.hz);
            const foundF1 = peakBetween(audio, 150, between);
            const foundF2 = peakBetween(audio, between, f2.hz * 1.8);
            expect(near(foundF1, f1.hz), `F1 ${foundF1} vs ${f1.hz}`).toBe(
                true,
            );
            expect(near(foundF2, f2.hz), `F2 ${foundF2} vs ${f2.hz}`).toBe(
                true,
            );
        });
    }

    test('two vowels are actually different sounds', () => {
        // The failure this guards against is a chain that renders *something*
        // for every syllable while ignoring which one it was. `i` and `u` are
        // the extremes of the F2 range, so nothing subtle is being asked for.
        const front = sing('i', Fundamental, 0.9);
        const back = sing('u', Fundamental, 0.9);
        expect(peakBetween(front, 1100, 2900)).toBeGreaterThan(
            peakBetween(back, 1100, 2900) + 500,
        );
    });

    test('a fricative puts its energy far above where a vowel puts any', () => {
        const vowel = sing('a', Fundamental, 0.9);
        const sibilant = sing('s', Fundamental, 0.9);
        const ratio = (audio: { samples: Float32Array; rate: number }) =>
            magnitudeAt(audio.samples, audio.rate, 5000) /
            Math.max(magnitudeAt(audio.samples, audio.rate, 800), 1e-12);
        expect(ratio(sibilant)).toBeGreaterThan(ratio(vowel) * 10);
    });

    test('a silent closure really is silent', () => {
        // The closure is the one segment whose gain is zero; if it were not,
        // every p, t, and k would begin with a buzz.
        const { samples } = sing('pa', Fundamental, 0.9);
        let peak = 0;
        for (const value of samples.slice(0, 400))
            peak = Math.max(peak, Math.abs(value));
        expect(peak).toBeLessThan(1e-6);
    });

    test('a note is filled edge to edge, with no silence at its end', () => {
        // `articulate` promises its segments tile the note; this is that
        // promise heard rather than counted.
        const { samples, rate } = sing('la', Fundamental, 0.9);
        let peak = 0;
        for (const value of samples.slice(
            samples.length - Math.round(0.05 * rate),
        ))
            peak = Math.max(peak, Math.abs(value));
        expect(peak).toBeGreaterThan(1e-4);
    });
});

/**
 * One test per complaint from listening to the chooser. Each measures the
 * acoustic property that was wrong, so a later table edit can't quietly undo
 * the fix — these are not properties anyone can eyeball in the numbers.
 */
describe('the four things that sounded wrong', () => {
    /** How peaky a spectrum is across a band: the loudest probe over the
     * median one. A resonance is peaky; frication is a plateau. */
    function peakiness(
        audio: { samples: Float32Array; rate: number },
        low: number,
        high: number,
    ): number {
        const magnitudes: number[] = [];
        for (let hz = low; hz <= high; hz += 50)
            magnitudes.push(magnitudeAt(audio.samples, audio.rate, hz));
        const sorted = [...magnitudes].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return Math.max(...magnitudes) / Math.max(median, 1e-12);
    }

    test('a fricative is a plateau, not a set of pipes', () => {
        // Four bandpasses at Q 3.5–13 over noise are four tuned pipes, and
        // that is what they sounded like. Frication is broadband.
        const s = peakiness(sing('s', Fundamental, 0.9), 3000, 9000);
        const vowel = peakiness(sing('a', Fundamental, 0.9), 300, 3000);
        expect(s).toBeLessThan(vowel);
        expect(s).toBeLessThan(6);
    });

    test('the nasals differ from each other, at their own zeros', () => {
        // Place of articulation is carried entirely by where the antiformant
        // sits, so if the zero is too narrow to remove a band they are all the
        // same buzzy vowel — which is how they sounded.
        const at = (symbol: string, hz: number) =>
            magnitudeAt(sing(symbol, Fundamental, 0.9).samples, 44100, hz);
        // m's zero is at 860, n's at 1840: each should be quieter than the
        // other exactly where its own zero is.
        expect(at('m', 860)).toBeLessThan(at('n', 860));
        expect(at('n', 1840)).toBeLessThan(at('m', 1840));
    });

    test('a nasal is darker than a vowel', () => {
        // A murmur comes out of a long lossy tube; if its upper formants are
        // near vowel strength it reads as a buzzy vowel rather than a nose.
        const high = (symbol: string) =>
            magnitudeAt(sing(symbol, Fundamental, 0.9).samples, 44100, 2500) /
            Math.max(
                magnitudeAt(sing(symbol, Fundamental, 0.9).samples, 44100, 300),
                1e-12,
            );
        expect(high('m')).toBeLessThan(high('a'));
    });

    test("a stop's burst reaches full amplitude inside its own window", () => {
        // The bug this guards: every level moved over a fixed 8ms ramp, and a
        // burst is 12ms, so it was a slow swell cut off before it arrived —
        // audible as blowing rather than as a consonant.
        const { samples, rate } = sing('apa', Fundamental, 0.9);
        const segments = articulate('apa', 0.9);
        const burst = segments.find(
            (segment) => segment.gain > 0 && segment.noise === 1,
        );
        expect(burst).toBeDefined();
        if (burst === undefined) return;
        expect(burst.ramp).toBeLessThan(burst.seconds / 4);
        // And the closure before it really is silent, so the burst has an edge.
        const closureAt = Math.round((burst.at - 0.01) * rate);
        expect(Math.abs(samples[closureAt])).toBeLessThan(1e-6);
    });
});
