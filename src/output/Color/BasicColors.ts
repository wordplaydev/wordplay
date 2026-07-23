import type Locales from '@locale/Locales';
import { getFirstText } from '@locale/LocaleText';

/** Cross-language color names anchored in LCH perceptual color space.
 *
 *  The set of 11 Basic Color Terms (BCTs) below is the cross-culturally
 *  consistent core identified by Berlin & Kay (1969) and corroborated by the
 *  World Color Survey (Cook, Kay & Regier 2005) and Hsieh et al. (2020) for
 *  Mandarin. Each BCT has a "focal" point — the most representative LCH
 *  triple for that category — and any color is described by its nearest
 *  focal(s) plus an optional light/dark modifier. */

/** Canonical English keys for the 11 Basic Color Terms. */
export const BCTKeys = [
    'black',
    'white',
    'gray',
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'brown',
    'pink',
] as const;
export type BCTKey = (typeof BCTKeys)[number];

/** Focal LCH points (lightness 0–1, chroma 0–~150, hue 0–360°). Starting
 *  values calibrated against CSS named colors; tune by ear & eye over time. */
export const Focals: Record<BCTKey, { l: number; c: number; h: number }> = {
    red: { l: 0.54, c: 107, h: 40 },
    orange: { l: 0.7, c: 78, h: 55 },
    yellow: { l: 0.92, c: 96, h: 100 },
    green: { l: 0.55, c: 90, h: 142 },
    blue: { l: 0.45, c: 80, h: 260 },
    purple: { l: 0.4, c: 70, h: 310 },
    pink: { l: 0.8, c: 45, h: 0 },
    brown: { l: 0.4, c: 45, h: 50 },
    black: { l: 0.0, c: 0, h: 0 },
    white: { l: 1.0, c: 0, h: 0 },
    gray: { l: 0.5, c: 0, h: 0 },
};

/** Subset of BCTs that carry hue. The achromatic three (black/white/gray)
 *  are handled by the chroma gate below, not by distance to a focal hue. */
const CHROMATIC: BCTKey[] = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'brown',
];

/** Below this chroma we treat the color as achromatic. ~8 catches near-
 *  grays while preserving any color with even mild saturation. */
const ACHROMATIC_CHROMA = 8;

/** Lightness thresholds for the achromatic family. */
const BLACK_L = 0.05;
const WHITE_L = 0.95;
/** Within the gray band, anything above LIGHT_GRAY_L reads as "light gray",
 *  anything below DARK_GRAY_L reads as "dark gray". Between them, plain
 *  "gray". */
const LIGHT_GRAY_L = 0.65;
const DARK_GRAY_L = 0.35;

/** If the second-closest chromatic focal is within MIX_RATIO * d(closest),
 *  the color is described as a mix of the two (e.g. "blue-purple"). 1.25
 *  catches genuine boundary hues without firing on every off-focal point. */
const MIX_RATIO = 1.25;

/** Lightness modifier appears once |ΔL| from the matched focal exceeds
 *  this threshold. */
const MODIFIER_DELTA = 0.18;

/** Weight on the lightness axis when computing perceptual distance: L is
 *  on 0–1 but a/b components of chroma×hue sweep ~0–100, so we scale L up
 *  so it doesn't dominate the match. */
const L_WEIGHT = 25;

export type ColorDescription = {
    /** One BCT, or two when the color lies near a boundary. */
    bcts: [BCTKey] | [BCTKey, BCTKey];
    /** "light" or "dark" when lightness diverges from the matched focal;
     *  undefined when the color sits near the focal lightness. */
    modifier: 'light' | 'dark' | undefined;
};

function normalizeHue(h: number): number {
    const mod = ((h % 360) + 360) % 360;
    return mod;
}

/** Perceptual distance from (l, c, h) to a focal point, with hue converted
 *  to (a, b) so 359° and 1° are neighbors. */
function distance(
    l: number,
    c: number,
    h: number,
    focal: { l: number; c: number; h: number },
): number {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const a1 = c * Math.cos(rad(h));
    const b1 = c * Math.sin(rad(h));
    const a2 = focal.c * Math.cos(rad(focal.h));
    const b2 = focal.c * Math.sin(rad(focal.h));
    const dl = (l - focal.l) * L_WEIGHT;
    const da = a1 - a2;
    const db = b1 - b2;
    return Math.sqrt(dl * dl + da * da + db * db);
}

/** Classify an LCH color (lightness 0–1, chroma 0–∞, hue degrees) as one
 *  or two BCTs with an optional light/dark modifier. */
export function describeColor(
    l: number,
    c: number,
    h: number,
): ColorDescription {
    const hue = normalizeHue(h);
    // Achromatic gate — low chroma reads as gray-family.
    if (c <= ACHROMATIC_CHROMA) {
        if (l < BLACK_L) return { bcts: ['black'], modifier: undefined };
        if (l > WHITE_L) return { bcts: ['white'], modifier: undefined };
        const modifier =
            l >= LIGHT_GRAY_L
                ? 'light'
                : l <= DARK_GRAY_L
                  ? 'dark'
                  : undefined;
        return { bcts: ['gray'], modifier };
    }

    // Rank the chromatic focals by perceptual distance.
    const ranked = CHROMATIC.map(
        (key) =>
            [key, distance(l, c, hue, Focals[key])] as const,
    ).sort((a, b) => a[1] - b[1]);

    const [closestKey, closestDist] = ranked[0];
    const [secondKey, secondDist] = ranked[1];

    const bcts: ColorDescription['bcts'] =
        secondDist <= closestDist * MIX_RATIO
            ? [closestKey, secondKey]
            : [closestKey];

    // Lightness modifier relative to the matched focal.
    const focal = Focals[closestKey];
    const dl = l - focal.l;
    const modifier =
        dl > MODIFIER_DELTA
            ? 'light'
            : dl < -MODIFIER_DELTA
              ? 'dark'
              : undefined;

    return { bcts, modifier };
}

/** Render a `ColorDescription` to a localized string. Joins mixes with the
 *  locale's `mix` template, prefixes with the localized `light`/`dark`
 *  modifier via the `modified` template, and pulls each BCT name from
 *  the locale's `colors.<bct>.names[0]`. */
export function renderColorDescription(
    locales: Locales,
    description: ColorDescription,
): string {
    const colorEntries = locales.getLocale().output.Color.colors;
    const names = description.bcts.map((bct) =>
        getFirstText(colorEntries[bct].names),
    );
    const joined =
        names.length === 1
            ? names[0]
            : locales
                  .concretize(
                      (l) => l.output.Color.description.mix,
                      { first: names[0], second: names[1] },
                  )
                  .toText();
    if (description.modifier === undefined) return joined;
    const modifierWord = locales.getLocale().output.Color.description[
        description.modifier
    ];
    return locales
        .concretize(
            (l) => l.output.Color.description.modified,
            { modifier: modifierWord, color: joined },
        )
        .toText();
}

/** Localize a Color directly to its description string. */
export function describeColorLocalized(
    locales: Locales,
    l: number,
    c: number,
    h: number,
): string {
    return renderColorDescription(locales, describeColor(l, c, h));
}
