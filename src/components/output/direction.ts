import type Locales from '@locale/Locales';
import { formatNumberForLocale } from '@locale/numberFormats';
import type { Orientation } from '@output/animation/Animator';

/**
 * How far something must move, in metres, before the movement is worth
 * naming. Below this, a "move" is jitter from an animation settling or a
 * physics body at rest, and announcing a direction for it would be noise.
 * A metre is 64 screen pixels (PX_PER_METER), so this is about a pixel.
 */
export const MinimumMovement = 0.015;

/** How far something must turn, in degrees, before the turn is worth naming. */
const MinimumRotation = 1;

/**
 * The eight compass directions, as indices into the localized
 * `ui.output.directions` list. Index 0 is up and they proceed clockwise, so
 * an angle maps to an index by dividing the circle into eight sectors.
 */
const Directions = 8;

/**
 * How an output moved between two orientations, as localized text — or
 * undefined when it didn't perceptibly move.
 *
 * Direction is in STAGE space, not screen space: positive y is up (the CSS
 * transform negates it, see outputToCSS), and if the camera is rotated,
 * "up" is the stage's up, matching how a creator reads Place in code.
 */
export default function describeDirection(
    locales: Locales,
    prior: Orientation,
    present: Orientation,
): string | undefined {
    const dx = present.place.x - prior.place.x;
    const dy = present.place.y - prior.place.y;
    const dz = present.place.z - prior.place.z;

    // Movement in the plane wins: it's what a viewer would notice first.
    if (Math.hypot(dx, dy) >= MinimumMovement) {
        // atan2(dx, dy) measures clockwise from up, which is the order the
        // localized direction list is written in.
        const angle = Math.atan2(dx, dy);
        const sector =
            (Math.round((angle / (2 * Math.PI)) * Directions) + Directions) %
            Directions;
        return locales.getPrimaryPlainText(
            (l) => l.ui.output.directions[sector],
        );
    }

    // Then depth: nearer or farther from the viewer. Negative z is toward the
    // viewer, matching the stage's default focus at z = -12.
    if (Math.abs(dz) >= MinimumMovement)
        return locales.getPrimaryPlainText((l) =>
            dz < 0 ? l.ui.output.closer : l.ui.output.farther,
        );

    // Finally rotation, which is a move with no change of place at all.
    const rotation = (present.rotation ?? 0) - (prior.rotation ?? 0);
    if (Math.abs(rotation) >= MinimumRotation)
        return locales.getPrimaryPlainText((l) => l.ui.output.turned);

    return undefined;
}

/**
 * Where something ended up, as short localized text.
 *
 * The destination rides along with every move announcement because a screen
 * reader will not re-read a live region whose text is unchanged: pressing the
 * same arrow twice would otherwise produce "cat moved left" both times and be
 * heard once. Coordinates always differ when something actually moved.
 * Rounded to tenths, for the same reason numbers are elsewhere — precision no
 * one can perceive is noise.
 */
export function describePlace(
    locales: Locales,
    // Structural rather than a `Place`, so a caller with a candidate position
    // in hand (an unsnapped drag target) needn't mint a runtime value to say it.
    place: { x: number; y: number; z: number },
): string {
    const locale = locales.getLocale();
    const round = (n: number) =>
        `${formatNumberForLocale(
            (Math.round(n * 10) / 10).toString(),
            locale,
        )}m`;
    // Depth only when there is any, so the flat common case stays short.
    return Math.abs(place.z) >= MinimumMovement
        ? `${round(place.x)} ${round(place.y)} ${round(place.z)}`
        : `${round(place.x)} ${round(place.y)}`;
}
