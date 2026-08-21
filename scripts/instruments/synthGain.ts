/**
 * Derive a synthesis recipe's peak gain by measuring it, the way every gain in
 * `src/output/Music/synthesis.ts` was derived and the way
 * `scripts/instruments/voiceGain.ts` derives the voice's.
 *
 * The palette's loudness contract is that a synthesized instrument lands where
 * a sampled one does: zones are normalized to −26 LUFS and played at
 * `SampleGain`, which puts them at about −33.5 LUFS. A gain chosen by ear
 * instead means an instrument leaps in volume the moment its recording
 * finishes loading.
 *
 * `MusicAudio` is a Web Audio graph and this runs in Node, so this builds an
 * offline twin of the oscillator path — the same band-limited waveform, the
 * same linear-ramp envelope, the same lowpass at the same cutoff — and meters
 * it with the pipeline's own ITU-R BS.1770-4 implementation. Loudness is
 * linear in gain, so one render at unity solves for the rest.
 *
 * It is a model, so it is checked against the palette rather than trusted:
 * run it with no arguments and it reports every recipe's shipped gain beside
 * the measured one. A twin that can't reproduce the gains already in the file
 * is wrong about the ones it hasn't seen.
 *
 *   npx tsx scripts/instruments/synthGain.ts            every recipe
 *   npx tsx scripts/instruments/synthGain.ts harmonica  just one
 */

import { measureLoudness, measureShortTermLoudness, type Mono } from './audio';
import { SampleRate, TargetLoudness } from './manifest';
import { Recipes, type SynthRecipe } from '../../src/output/Music/synthesis';
import { InstrumentKeys } from '../../src/output/Music/instruments';
import { TonicHz } from '../../src/output/Music/degrees';

/** Where a normalized zone actually sits once `MusicAudio` applies its
 * `SampleGain`. The number a synthesized note has to match. */
const SampleGain = 0.42;
const PlayedLoudness = TargetLoudness + 20 * Math.log10(SampleGain);

/** The note the palette is balanced at, and how long it is held. One beat at
 * 60bpm on middle C: long enough for a sustained recipe to reach sustain and
 * for the meter to fill a 400ms block, short enough that a plucked one is
 * still mostly ringing rather than silence. */
const ReferenceSeconds = 1;

/**
 * One period of a built-in oscillator type, band-limited the way
 * `OscillatorNode` is and normalized to peak 1, which is what Web Audio does
 * to its built-in `PeriodicWave`s. A naive ramp would carry aliased energy
 * above Nyquist that the real graph never produces.
 */
function harmonics(
    source: SynthRecipe['source'],
    index: number,
): number | undefined {
    // Amplitude of the index'th harmonic, or undefined where there is none.
    if (source === 'sine') return index === 1 ? 1 : undefined;
    if (source === 'sawtooth') return (2 / Math.PI) * (1 / index);
    if (source === 'square')
        return index % 2 === 1 ? (4 / Math.PI) * (1 / index) : undefined;
    if (source === 'triangle')
        return index % 2 === 1
            ? (8 / Math.PI ** 2) * (1 / index ** 2)
            : undefined;
    return undefined;
}

function oscillate(
    source: SynthRecipe['source'],
    hz: number,
    frames: number,
    rate: number,
): Float32Array {
    const out = new Float32Array(frames);
    if (source === 'noise') {
        // A deterministic white noise, so a rerun gives the same number.
        let seed = 1;
        for (let i = 0; i < frames; i++) {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            out[i] = (seed / 1073741824 - 1) * 0.5;
        }
        return out;
    }
    const limit = Math.floor(rate / 2 / hz);
    for (let index = 1; index <= limit; index++) {
        const amplitude = harmonics(source, index);
        if (amplitude === undefined) continue;
        const w = (2 * Math.PI * index * hz) / rate;
        // Alternating sign for the triangle, whose odd harmonics invert.
        const sign = source === 'triangle' && (index - 1) % 4 === 2 ? -1 : 1;
        for (let i = 0; i < frames; i++)
            out[i] += sign * amplitude * Math.sin(w * i);
    }
    let peak = 0;
    for (const value of out) peak = Math.max(peak, Math.abs(value));
    if (peak > 0) for (let i = 0; i < frames; i++) out[i] /= peak;
    return out;
}

/** The envelope `MusicAudio` writes onto its gain node: linear ramps to peak,
 * to sustain, and to silence, with the note held in between. */
function envelope(
    recipe: SynthRecipe,
    seconds: number,
    rate: number,
): Float32Array {
    const { attack, decay, sustain, release } = recipe.envelope;
    const frames = Math.round((seconds + release) * rate);
    const out = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
        const t = i / rate;
        out[i] =
            t < attack
                ? t / Math.max(attack, 1e-6)
                : t < attack + decay
                  ? 1 + (sustain - 1) * ((t - attack) / Math.max(decay, 1e-6))
                  : t < seconds
                    ? sustain
                    : sustain * (1 - (t - seconds) / Math.max(release, 1e-6));
    }
    return out;
}

/**
 * `BiquadFilterNode`'s lowpass at its default Q of 1. Q is in dB for this
 * filter type, per the Web Audio spec, which is why it appears as a power of
 * ten rather than a divisor.
 */
function lowpass(
    samples: Float32Array,
    hz: number,
    rate: number,
): Float32Array {
    const w = (2 * Math.PI * hz) / rate;
    const alpha = Math.sin(w) / (2 * 10 ** (1 / 20));
    const cos = Math.cos(w);
    const a0 = 1 + alpha;
    const b = [(1 - cos) / 2 / a0, (1 - cos) / a0, (1 - cos) / 2 / a0];
    const a = [(-2 * cos) / a0, (1 - alpha) / a0];
    const out = new Float32Array(samples.length);
    let x1 = 0,
        x2 = 0,
        y1 = 0,
        y2 = 0;
    for (let i = 0; i < samples.length; i++) {
        const x = samples[i];
        const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[0] * y1 - a[1] * y2;
        out[i] = y;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
    }
    return out;
}

/** One note of a recipe at unity peak gain. */
export function render(recipe: SynthRecipe, seconds = ReferenceSeconds): Mono {
    const shape = envelope(recipe, seconds, SampleRate);
    const source = oscillate(recipe.source, TonicHz, shape.length, SampleRate);
    const samples = new Float32Array(shape.length);
    for (let i = 0; i < shape.length; i++) samples[i] = source[i] * shape[i];
    return {
        samples:
            recipe.cutoff === undefined
                ? samples
                : lowpass(samples, recipe.cutoff, SampleRate),
        rate: SampleRate,
    };
}

/**
 * The gain that puts this recipe where a sampled zone lands. Percussion is
 * metered by its loudest short-term window for the same reason the sample
 * pipeline meters it that way: integrating over a note that is mostly decay
 * under-reads it.
 */
export function gainFor(recipe: SynthRecipe): number {
    const audio = render(recipe);
    const measured =
        recipe.envelope.sustain === 0
            ? measureShortTermLoudness(audio)
            : measureLoudness(audio);
    return 10 ** ((PlayedLoudness - measured) / 20);
}

function main() {
    const only = process.argv[2];
    console.log(`Matching ${PlayedLoudness.toFixed(2)} LUFS.\n`);
    console.log('instrument        shipped  measured   error');
    for (const key of InstrumentKeys) {
        if (only !== undefined && key !== only) continue;
        const recipe = Recipes[key];
        // The voice is not a waveform; `voiceGain.ts` measures that graph.
        if (recipe.source === 'voice') continue;
        const gain = gainFor(recipe);
        const error = 20 * Math.log10(gain / recipe.gain);
        console.log(
            `${key.padEnd(16)} ${recipe.gain.toFixed(4)}  ${gain.toFixed(4)}  ${error >= 0 ? '+' : ''}${error.toFixed(2)} dB`,
        );
    }
}

// Only when run as a script, so importing `gainFor` costs nothing.
if (process.argv[1]?.endsWith('synthGain.ts') === true) main();
