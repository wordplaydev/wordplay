import { PitchDetector } from 'pitchy';

export const VOLUME_FFT_SIZE = 32;

export function computeVolume(
    sampleRate: number,
    buffer: Uint8Array,
): number {
    const frequencies = Array.from(buffer);

    let sumOfSquares = 0.0;
    let frequency = 0;
    let count = 0;
    for (const amplitude of frequencies) {
        frequency += (sampleRate / 2 / frequencies.length);
        if (frequency >= 0 && frequency <= 4000) {
            sumOfSquares += amplitude * amplitude;
            count++;
        }
    }

    return Math.floor((100 * Math.sqrt(sumOfSquares / count)) / 256) / 100;
}

export const PITCH_FFT_SIZE = 1024;

/**
 * How loud a window has to be, as the RMS of its samples, before we believe a
 * pitch in it.
 *
 * Clarity cannot answer this. McLeod's measure is normalized, so it says how
 * *periodic* a window is, not how loud — quiet room noise scores as well as
 * singing. Measured on a real take (see `MinLevel` in
 * `@output/Music/transcribe`): breath and room noise reached clarities up to
 * 0.977 while sitting near 0.008 RMS, and the singing sat near 0.086. This sits
 * in that empty gap, nearer the noise so that quiet singing still counts.
 */
export const MinPitchLevel = 0.02;

/**
 * A detector that reports nothing rather than inventing a pitch in room noise.
 * Live surfaces share it so they all answer "is anyone making a sound" the same
 * way; a whole recording is gated relatively instead, against its own loudest.
 */
export function createPitchDetector(): PitchDetector<Float32Array> {
    const detector = PitchDetector.forFloat32Array(PITCH_FFT_SIZE);
    // Below this, findPitch returns a clarity of 0, which computePitch already
    // reads as silence. Absolute rather than decibels: pitchy converts dB with
    // a power exponent (10 ** (db / 10)), so -40dB would mean 0.0001 RMS, not
    // the 0.01 a reader would assume.
    detector.minVolumeAbsolute = MinPitchLevel;
    return detector;
}

export function computePitch(
    detector: PitchDetector<Float32Array>,
    sampleRate: number,
    buffer: Float32Array,
): number {
    const [frequency, clarity] = detector.findPitch(buffer, sampleRate);
    return clarity < 0.75 ? 0 : Math.floor(frequency);
}
