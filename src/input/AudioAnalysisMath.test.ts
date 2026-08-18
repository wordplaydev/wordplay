import { expect, test } from 'vitest';
import {
    MinPitchLevel,
    PITCH_FFT_SIZE,
    computePitch,
    createPitchDetector,
} from './AudioAnalysisMath';

/**
 * The detector is happy to find a period in room noise — on a real take it
 * reported pitches at clarities up to 0.977 in nothing but breath. Only
 * loudness separates those from singing, so these pin the volume gate with
 * signals that clarity alone would accept.
 */

const SampleRate = 44100;

/** A pure tone, so any rejection is the volume gate rather than a weak pitch. */
function tone(hz: number, amplitude: number): Float32Array {
    const samples = new Float32Array(PITCH_FFT_SIZE);
    for (let i = 0; i < samples.length; i++)
        samples[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / SampleRate);
    return samples;
}

/** The RMS of a window, the quantity the gate compares against. */
function level(samples: Float32Array): number {
    let squares = 0;
    for (const sample of samples) squares += sample * sample;
    return Math.sqrt(squares / samples.length);
}

test('a tone at singing loudness is still detected', () => {
    const samples = tone(440, 0.2);
    expect(level(samples)).toBeGreaterThan(MinPitchLevel);
    expect(
        computePitch(createPitchDetector(), SampleRate, samples),
    ).toBeCloseTo(440, -1);
});

test('the same tone at room-noise loudness is silence', () => {
    // 0.008 RMS is what breath and room noise measured at; a sine this quiet is
    // perfectly periodic, so clarity would accept it and only volume rejects it.
    const samples = tone(440, 0.008 * Math.SQRT2);
    expect(level(samples)).toBeLessThan(MinPitchLevel);
    expect(computePitch(createPitchDetector(), SampleRate, samples)).toBe(0);
});

test('an ungated detector hears that same room noise as a pitch', () => {
    // Guards the gate itself: without it this window produces a pitch, which is
    // the reported bug (notes in a silent room).
    const samples = tone(440, 0.008 * Math.SQRT2);
    const ungated = createPitchDetector();
    ungated.minVolumeAbsolute = 0;
    expect(computePitch(ungated, SampleRate, samples)).toBeGreaterThan(0);
});

test('silence is silence', () => {
    const samples = new Float32Array(PITCH_FFT_SIZE);
    expect(computePitch(createPitchDetector(), SampleRate, samples)).toBe(0);
});
