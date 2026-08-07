/**
 * Derive the vocal synthesizer's peak gain by measuring it, the same way every
 * gain in `src/output/Music/synthesis.ts` was derived.
 *
 * The palette's loudness contract is that a synthesized instrument lands where
 * a sampled one does: zones are normalized to −26 LUFS and played at
 * `SampleGain`, which puts them at about −33.5 LUFS. A gain chosen by ear
 * instead would make the voice leap out of, or vanish under, everything
 * around it.
 *
 * The voice cannot be rendered by the pipeline's own tools, because it is a
 * Web Audio graph and this runs in Node. So this builds an offline twin of
 * that graph — the same glottal harmonics, the same parallel bandpass bank at
 * the same centre frequencies and bandwidths, the same alternating
 * amplitudes — and measures *that* with the pipeline's ITU-R BS.1770-4 meter.
 * It is a model, so it is checked against the palette rather than trusted
 * absolutely: run it, hear the result beside a piano, and adjust if the model
 * and the browser disagree.
 *
 * Run with `npx tsx scripts/instruments/voiceGain.ts`.
 */

import { measureLoudness, type Mono } from './audio';
import { Phonemes } from '../../src/output/Music/phonemes';
import { articulate } from '../../src/output/Music/articulate';
import {
    Breath,
    ChorusCents,
    SourceHarmonics,
    SourceTilt,
    tuneFirstFormant,
} from '../../src/output/Music/voice';
import { SampleRate, TargetLoudness } from './manifest';

/** Where a normalized zone actually sits after `SampleGain` is applied. */
const SampleGain = 0.42;
const PlayedLoudness = TargetLoudness + 20 * Math.log10(SampleGain);

/** One biquad's worth of state, applied sample by sample. */
type Section = { b: [number, number, number]; a: [number, number] };

/** A bandpass with unity peak gain, matching `BiquadFilterNode`'s
 * `'bandpass'`, whose Q is centre over bandwidth. */
function bandpass(hz: number, q: number, rate: number): Section {
    const w = (2 * Math.PI * hz) / rate;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    return {
        b: [alpha / a0, 0, -alpha / a0],
        a: [(-2 * Math.cos(w)) / a0, (1 - alpha) / a0],
    };
}

/** A notch with unity gain away from its centre, matching `BiquadFilterNode`'s
 * `'notch'` — the antiformant a nasal's place of articulation lives in. */
function notch(hz: number, q: number, rate: number): Section {
    const w = (2 * Math.PI * hz) / rate;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    return {
        b: [1 / a0, (-2 * Math.cos(w)) / a0, 1 / a0],
        a: [(-2 * Math.cos(w)) / a0, (1 - alpha) / a0],
    };
}

function run(input: Float32Array, section: Section): Float32Array {
    const out = new Float32Array(input.length);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let index = 0; index < input.length; index++) {
        const x = input[index];
        const y =
            section.b[0] * x +
            section.b[1] * x1 +
            section.b[2] * x2 -
            section.a[0] * y1 -
            section.a[1] * y2;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        out[index] = y;
    }
    return out;
}

/** The glottal pair plus breath, at one pitch, held for `seconds`. */
function source(
    fundamental: number,
    seconds: number,
    rate: number,
): Float32Array {
    const length = Math.round(seconds * rate);
    const samples = new Float32Array(length);
    // `createPeriodicWave` normalizes to unit peak, so the twin must too.
    const partials: number[] = [];
    for (let harmonic = 1; harmonic <= SourceHarmonics; harmonic++)
        partials.push(1 / Math.pow(harmonic, SourceTilt));
    for (const cents of [ChorusCents, -ChorusCents]) {
        const hz = fundamental * Math.pow(2, cents / 1200);
        for (let index = 0; index < length; index++) {
            let value = 0;
            for (let n = 0; n < partials.length; n++) {
                const frequency = hz * (n + 1);
                if (frequency > rate / 2) break;
                value +=
                    partials[n] *
                    Math.sin((2 * Math.PI * frequency * index) / rate);
            }
            samples[index] += value / 2;
        }
    }
    let peak = 0;
    for (const value of samples) peak = Math.max(peak, Math.abs(value));
    if (peak > 0) for (let i = 0; i < samples.length; i++) samples[i] /= peak;
    return samples;
}

function noise(length: number): Float32Array {
    const samples = new Float32Array(length);
    // Deterministic, so two runs of this script agree.
    let seed = 12345;
    for (let index = 0; index < length; index++) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        // ±1, matching `MusicAudio`'s `Math.random() * 2 - 1` buffer.
        samples[index] = (seed / 2147483648) * 2 - 1;
    }
    return samples;
}

/** Render one sung note through the offline twin of the vocal graph. */
export function sing(
    words: string,
    fundamental: number,
    seconds: number,
): Mono {
    const rate = SampleRate;
    const glottal = source(fundamental, seconds, rate);
    const breath = noise(glottal.length);
    const segments = articulate(words, seconds);
    const out = new Float32Array(glottal.length);

    for (const segment of segments) {
        const from = Math.round(segment.at * rate);
        const to = Math.min(
            glottal.length,
            Math.round((segment.at + segment.seconds) * rate),
        );
        if (to <= from) continue;
        // Mix the two sources at this segment's ratio, exactly as the graph's
        // two gain nodes do.
        const voicing = segment.voiced ? 1 - segment.noise : 0;
        const breathiness = Math.max(
            segment.noise,
            segment.voiced ? Breath : 0,
        );
        const mixed = new Float32Array(to - from);
        for (let index = from; index < to; index++)
            mixed[index - from] =
                glottal[index] * voicing + breath[index] * breathiness;
        // Then the parallel bank, summed with its alternating amplitudes.
        const summed = new Float32Array(to - from);
        segment.formants.forEach((formant, which) => {
            const hz = Math.min(
                which === 0
                    ? tuneFirstFormant(formant.hz, fundamental)
                    : formant.hz,
                rate / 2 - 100,
            );
            const filtered = run(mixed, bandpass(hz, hz / formant.bw, rate));
            const amplitude = segment.gain * formant.gain;
            for (let index = 0; index < filtered.length; index++)
                summed[index] += filtered[index] * amplitude;
        });
        // And the antiformant over the sum, exactly where `MusicAudio` puts it.
        // Leaving it out made the twin blind to the one thing that tells a
        // nasal's place of articulation, and quietly overstated their level.
        const shaped =
            segment.antiformant === undefined
                ? summed
                : run(
                      summed,
                      notch(
                          segment.antiformant.hz,
                          segment.antiformant.hz / segment.antiformant.bw,
                          rate,
                      ),
                  );
        for (let index = 0; index < shaped.length; index++)
            out[from + index] += shaped[index];
    }
    return { samples: out, rate };
}

/**
 * A phrase covering what the voice actually does, rather than one held vowel.
 * Measuring a single `a` would set the level by the loudest thing the
 * instrument can do and leave every lyric quiet.
 */
const Phrase = ['a', 'i', 'u', 'la', 'mi', 'so', 'ta', 'ne', 'ʃa'];

function main() {
    let total = 0;
    let count = 0;
    console.log('  syllable   loudness');
    for (const words of Phrase) {
        // Two octaves apart, since a synthesized voice's level should not
        // depend on the note the way its formants deliberately do not.
        for (const fundamental of [110, 220, 440]) {
            const loudness = measureLoudness(sing(words, fundamental, 1.2));
            if (!Number.isFinite(loudness)) continue;
            total += loudness;
            count += 1;
            if (fundamental === 220)
                console.log(
                    `  ${words.padEnd(10)} ${loudness.toFixed(1)} LUFS`,
                );
        }
    }
    const average = total / count;
    const gain = Math.pow(10, (PlayedLoudness - average) / 20);
    console.log(
        `\naverage ${average.toFixed(1)} LUFS at unit gain` +
            `\ntarget  ${PlayedLoudness.toFixed(1)} LUFS (a zone at ${TargetLoudness} LUFS × ${SampleGain})` +
            `\n\nVoiceGain = ${gain.toFixed(3)}`,
    );
    balance();
}

/**
 * Every phoneme's level relative to an open vowel, against what speech
 * actually does.
 *
 * This is the check that matters most for a lyric: a bank of four bandpasses
 * over full-scale noise is naturally *louder* than a vowel, which is the
 * opposite of a real `/s/`, and without correcting for it every word lurches
 * at its sibilants. The targets are rough published figures for relative
 * phone power; anything more than a few LU off wants its `gain` adjusted in
 * `phonemes.ts`.
 */
function balance() {
    const targets: Record<string, number> = {
        a: 0,
        ɑ: 0,
        ɛ: -2,
        // Lehiste & Peterson put a close front vowel about 5 dB under an
        // open one; sources vary by a couple of dB either way.
        i: -5,
        u: -4,
        l: -6,
        r: -6,
        m: -11,
        n: -11,
        ʃ: -8,
        s: -10,
        z: -14,
        v: -18,
        f: -19,
        θ: -20,
    };
    const reference = measureLoudness(sing('a', 220, 1.2));
    console.log('\nphoneme   measured   wanted   error');
    for (const [symbol, target] of Object.entries(targets)) {
        if (!Phonemes.has(symbol)) continue;
        const relative = measureLoudness(sing(symbol, 220, 1.2)) - reference;
        const error = relative - target;
        console.log(
            `  ${symbol.padEnd(8)} ${relative.toFixed(1).padStart(6)} ` +
                `${target.toFixed(0).padStart(8)} ${error.toFixed(1).padStart(7)}` +
                (Math.abs(error) > 3 ? '   ←' : ''),
        );
    }
}

// Only when run as a script; `voiceGain.test.ts` imports `sing` from here and
// must not set the whole calibration going to do it.
if (process.argv[1]?.endsWith('voiceGain.ts') === true) main();
