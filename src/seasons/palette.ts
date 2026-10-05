/**
 * The palette as data: the raw `--name-light`/`--name-dark` pairs app.html
 * declares, which every `--color-*` and `--wordplay-*` token is composed from.
 * A season overrides only raw pairs, so dark mode, light-dark(), and every
 * semantic role keep working unchanged on top of it.
 */

export type Mode = 'light' | 'dark';

export const Modes: readonly Mode[] = ['light', 'dark'];

/** Raw pairs a season may recolor: the brand hues, their text variants, the
 *  selection tint, and the page's neutral surfaces, so a season can tint its
 *  background. */
export const SeasonalNames = [
    'blue',
    'purple',
    'pink',
    'orange',
    'yellow',
    'yellow-transparent',
    'gold-text',
    'grey-text',
    'blue-text',
    'white',
    'very-light-grey',
    'light-grey',
    'dark-grey',
    'pressed',
] as const;

/** Raw pairs no season may recolor. Focus, error, and foreground are how a
 *  reader finds their place and their mistakes; they mean the same thing in
 *  every season. */
export const FixedNames = ['focus-blue', 'orange-text', 'black'] as const;

export type SeasonalName = (typeof SeasonalNames)[number];
export type FixedName = (typeof FixedNames)[number];
export type PaletteName = SeasonalName | FixedName;

export const PaletteNames: readonly PaletteName[] = [
    ...SeasonalNames,
    ...FixedNames,
];

/** A hex color: `#rrggbb`, or `#rrggbbaa` for a translucent tint. */
export type Hex = string;

/** A light and dark value for one raw pair. */
export type Pair = { light: Hex; dark: Hex };

/** Every raw pair the contrast checks reason about. */
export type Palette = Record<PaletteName, Pair>;

/** What a season declares: any subset of the pairs it may recolor. */
export type PaletteOverride = Partial<Record<SeasonalName, Pair>>;

export function isSeasonalName(name: string): name is SeasonalName {
    return SeasonalNames.some((candidate) => candidate === name);
}

/** The palette a season produces on top of the default. */
export function applyOverride(
    palette: Palette,
    override: PaletteOverride,
): Palette {
    return { ...palette, ...override };
}

export function isHex(value: string): boolean {
    return /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value);
}
