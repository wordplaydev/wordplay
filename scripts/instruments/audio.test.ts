import { describe, expect, test } from 'vitest';
import { alignAttack, type Mono } from './audio';

const Rate = 44100;
/** The window alignAttack measures its envelope in. */
const Window = Math.round(0.005 * Rate);

/** A quiet rise into a loud peak at `peakSeconds`, then a decay — the shape of
 * a plucked note, whose peak is its attack. */
function pluck(peakSeconds: number, seconds = 1): Mono {
    const samples = new Float32Array(Math.round(seconds * Rate));
    const peak = Math.round(peakSeconds * Rate);
    for (let i = 0; i < samples.length; i++) {
        const envelope =
            i <= peak ? i / Math.max(1, peak) : Math.exp(-(i - peak) / Rate);
        samples[i] = envelope * Math.sin((2 * Math.PI * 220 * i) / Rate);
    }
    return { samples, rate: Rate };
}

/** Where the loudest 5ms window starts, the way alignAttack measures it. */
function peakAt(audio: Mono): number {
    let best = 0;
    let at = 0;
    for (let i = 0; i + Window < audio.samples.length; i += Window) {
        let sum = 0;
        for (let j = i; j < i + Window; j++)
            sum += audio.samples[j] * audio.samples[j];
        const value = Math.sqrt(sum / Window);
        if (value > best) {
            best = value;
            at = i;
        }
    }
    return at / Rate;
}

describe('alignAttack', () => {
    test('pulls a late peak forward to the target', () => {
        // The case this exists for: a low string that takes 60ms to reach
        // full amplitude lands after everything else on the beat.
        const aligned = alignAttack(pluck(0.06), 0.015);
        expect(peakAt(aligned)).toBeCloseTo(0.015, 3);
    });

    test('pushes an early peak back to the target', () => {
        // Can't trim what isn't there, so it pads instead — otherwise a fast
        // attack would sit ahead of a slow one rather than beside it.
        const aligned = alignAttack(pluck(0.005), 0.015);
        expect(peakAt(aligned)).toBeCloseTo(0.015, 3);
    });

    test('leaves a peak already at the target alone', () => {
        const already = pluck(0.015);
        const aligned = alignAttack(already, peakAt(already));
        expect(aligned.samples.length).toBe(already.samples.length);
    });

    test('every zone of a set lands together, whatever its rise', () => {
        // The property that matters: after alignment the spread is gone.
        const peaks = [0.005, 0.02, 0.04, 0.085].map((rise) =>
            peakAt(alignAttack(pluck(rise), 0.015)),
        );
        expect(Math.max(...peaks) - Math.min(...peaks)).toBeLessThanOrEqual(
            0.005,
        );
    });

    test('eases in rather than starting mid-waveform', () => {
        // Cutting into a rising signal starts partway up a cycle, which is a
        // click unless the first few milliseconds ramp.
        const aligned = alignAttack(pluck(0.06), 0.015);
        expect(Math.abs(aligned.samples[0])).toBeLessThan(1e-6);
        let step = 0;
        for (let i = 1; i < 200; i++)
            step = Math.max(
                step,
                Math.abs(aligned.samples[i] - aligned.samples[i - 1]),
            );
        expect(step).toBeLessThan(0.05);
    });

    test('keeps the rate and loses nothing after the peak', () => {
        const source = pluck(0.06);
        const aligned = alignAttack(source, 0.015);
        expect(aligned.rate).toBe(Rate);
        // Only the lead-in is shorter; the note itself is untouched.
        expect(source.samples.length - aligned.samples.length).toBeCloseTo(
            0.045 * Rate,
            -2,
        );
    });
});
