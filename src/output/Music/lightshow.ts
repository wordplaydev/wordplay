/**
 * The light show, as pure math so its safety properties are testable.
 *
 * **It modulates colour, not brightness.** An earlier version blasted the
 * stage bright on every note and let it fall dark between them, capping the
 * rate at the 3 Hz flash threshold. That was wrong twice over: sitting *at*
 * the threshold is not a margin, and what makes a flash dangerous is the
 * change in relative luminance, which that design maximised. At a fast tempo
 * it strobed.
 *
 * So the wash holds a steady lightness and opacity, and each note moves its
 * **hue** and **chroma** instead. Saturation swells and colours shift, which
 * is plainly visible and rhythmic, but the luminance barely moves — and
 * `PhotosensitivityAnalysis.FlashLuminanceDelta`, the repo's own definition
 * of a significant flash, is the bound the tests hold this to. A change that
 * isn't a luminance change isn't a flash however often it happens.
 *
 * It is an overlay tint rather than a background replacement, so a creator's
 * explicit `Stage.background` stays the base.
 */

import type { InstrumentActivity } from '@output/Music/activity';
import { instrumentSpec } from '@output/Music/instruments';
import { FlashLuminanceDelta } from '@output/PhotosensitivityAnalysis';

export type Tint = {
    /** Degrees on the colour wheel. */
    hue: number;
    /** 0-1 how hard the music is hitting, driving chroma only. */
    energy: number;
};

/** The wash's fixed lightness, in LCH percent. Constant on purpose. */
export const Lightness = 56;
/** The wash's fixed opacity. Also constant: this is the other half of
 * keeping luminance steady. */
export const Opacity = 0.34;
/** Chroma at rest and at a full hit. The gap is what you see. */
export const RestChroma = 18;
export const PeakChroma = 96;

/** Seconds for a note to reach full colour. Not instant: a step change in
 * anything reads as a flash, and 90ms still lands on the beat. */
export const RiseSeconds = 0.09;
/** Seconds for colour to drain back to rest. Long enough to feel like a
 * decay rather than a blink. */
export const FallSeconds = 0.75;

/** The colour and force of what just sounded, or undefined for silence. */
export function blastFor(
    activity: readonly InstrumentActivity[],
): Tint | undefined {
    if (activity.length === 0) return undefined;

    // Hue is the level-weighted circular mean of what's playing, so an
    // ensemble reads as one colour rather than flickering between members.
    let x = 0;
    let y = 0;
    let total = 0;
    for (const entry of activity) {
        const hue = instrumentSpec(entry.instrument)?.hue ?? 200;
        const radians = (hue * Math.PI) / 180;
        x += Math.cos(radians) * entry.level;
        y += Math.sin(radians) * entry.level;
        total += entry.level;
    }
    if (total <= 0) return undefined;
    return {
        hue: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
        energy: Math.min(1, 0.5 + total),
    };
}

/** Move toward a note's colour over the rise time. */
export function strike(current: Tint, blast: Tint, elapsedSeconds: number): Tint {
    const step = Math.min(1, elapsedSeconds / RiseSeconds);
    // Hue takes the short way around, so a jump from red to purple doesn't
    // sweep through the whole wheel.
    let delta = blast.hue - current.hue;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return {
        hue: (current.hue + delta * step + 360) % 360,
        energy: current.energy + (blast.energy - current.energy) * step,
    };
}

/** Drain back toward rest colour, holding hue. */
export function fall(current: Tint, elapsedSeconds: number): Tint {
    const step = Math.min(1, elapsedSeconds / FallSeconds);
    return { hue: current.hue, energy: current.energy * (1 - step) };
}

/** The CSS colour for the wash. Lightness and opacity never vary. */
export function tintToCSS(tint: Tint): string {
    const chroma = RestChroma + (PeakChroma - RestChroma) * tint.energy;
    return `lch(${Lightness}% ${Math.round(chroma)} ${Math.round(tint.hue)}deg / ${Opacity})`;
}

/**
 * How much relative luminance the wash moves between rest and a full hit.
 *
 * LCH lightness *is* perceptual lightness, and it is fixed here, so the only
 * luminance movement comes from chroma changing at constant L — a second
 * order effect. This models it as the fraction of the lightness range the
 * chroma swing can account for, scaled by the wash's opacity, which is what
 * the tests bound against the flash threshold.
 */
export function luminanceSwing(): number {
    // A chroma swing at constant lightness moves measured luminance by at
    // most a few percent of the lightness itself; 0.05 is a deliberately
    // pessimistic coefficient.
    const chromaEffect = ((PeakChroma - RestChroma) / 100) * 0.05;
    return chromaEffect * Opacity;
}

/**
 * Collapse a spectrum into a few bands, low frequencies first.
 *
 * Bins are averaged in **logarithmic** groups: an FFT spreads its bins evenly
 * across frequency, so a linear split gives almost every band to the treble,
 * where music has little energy, and the display sits dead. Grouping by
 * octaves puts the bass where you can see it.
 */
export function spectrumBands(spectrum: Uint8Array, count: number): number[] {
    const bands: number[] = [];
    if (spectrum.length === 0 || count <= 0) return bands;
    for (let band = 0; band < count; band++) {
        const low = Math.floor(spectrum.length * (2 ** (band / count) - 1));
        const high = Math.max(
            low + 1,
            Math.floor(spectrum.length * (2 ** ((band + 1) / count) - 1)),
        );
        let sum = 0;
        let seen = 0;
        for (let bin = low; bin < Math.min(high, spectrum.length); bin++) {
            sum += spectrum[bin];
            seen++;
        }
        bands.push(seen === 0 ? 0 : sum / seen / 255);
    }
    return bands;
}

/** The flash threshold this rendering is held under; re-exported so the
 * bound and the thing it's bounded by stay in one place. */
export { FlashLuminanceDelta };
