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

export function computePitch(
    detector: PitchDetector<Float32Array>,
    sampleRate: number,
    buffer: Float32Array,
): number {
    const [frequency, clarity] = detector.findPitch(buffer, sampleRate);
    return clarity < 0.75 ? 0 : Math.floor(frequency);
}
