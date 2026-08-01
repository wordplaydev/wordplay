/**
 * The light show rendering, as pure math so its safety properties are
 * testable. The stage takes on the mood of the music — hue from what is
 * playing, brightness from how much is sounding.
 *
 * Two constraints shape it, both from the design's own safety rules. It is an
 * **overlay tint**, not a background replacement, so a creator's explicit
 * `Stage.background` stays the base. And its brightness is **rate-capped
 * below the photosensitivity flash threshold**: pulsing a full-screen colour
 * at tempo is exactly the full-screen flashing `PhotosensitivityAnalysis`
 * polices (120bpm in sixteenths is 8Hz, well inside the 3–60Hz band), so the
 * light show follows a smoothed envelope rather than the beat.
 */

import type { InstrumentActivity } from '@output/Music/activity';
import { Instruments, type InstrumentKey } from '@output/Music/instruments';
import { MinFlashHz } from '@output/PhotosensitivityAnalysis';

export type Tint = {
    /** Degrees on the colour wheel. */
    hue: number;
    /** 0-1 how strongly to tint. */
    strength: number;
};

/** The smoothing time constant, in seconds. Chosen so the tint's own rate of
 * change stays under the flash threshold no matter how fast the music is. */
export const SmoothingSeconds = 1 / MinFlashHz;

/** The strongest tint the overlay ever reaches, so the stage underneath is
 * always still legible and the change is never a flash. */
export const MaxStrength = 0.35;

/** Where the tint moves toward, given what is sounding right now. */
export function targetTint(activity: readonly InstrumentActivity[]): Tint {
    if (activity.length === 0) return { hue: 0, strength: 0 };

    // Hue is the level-weighted circular mean of the instruments playing, so
    // an ensemble reads as one colour rather than jumping between members.
    let x = 0;
    let y = 0;
    let total = 0;
    for (const entry of activity) {
        const hue = Instruments[entry.instrument as InstrumentKey]?.hue ?? 200;
        const radians = (hue * Math.PI) / 180;
        x += Math.cos(radians) * entry.level;
        y += Math.sin(radians) * entry.level;
        total += entry.level;
    }
    const hue =
        total === 0 ? 0 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;

    return {
        hue,
        strength: Math.min(MaxStrength, total * MaxStrength),
    };
}

/**
 * Move the current tint toward the target by at most what the elapsed time
 * allows. This is the rate cap: strength can never traverse its whole range
 * faster than `SmoothingSeconds`, so the overlay cannot flash however fast
 * the notes come.
 */
export function easeTint(
    current: Tint,
    target: Tint,
    elapsedSeconds: number,
): Tint {
    const step = Math.min(1, Math.max(0, elapsedSeconds / SmoothingSeconds));
    // Hue interpolates the short way around the wheel.
    let delta = target.hue - current.hue;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return {
        hue: (current.hue + delta * step + 360) % 360,
        strength:
            current.strength + (target.strength - current.strength) * step,
    };
}

/** The CSS colour for a tint overlay. */
export function tintToCSS(tint: Tint): string {
    return `lch(55% ${Math.round(tint.strength * 90)} ${Math.round(tint.hue)}deg / ${Math.round(tint.strength * 100)}%)`;
}
