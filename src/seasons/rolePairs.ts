import { contrast } from '#util/colorContrast.ts';
import type { Hex, Mode, Palette, PaletteName } from './palette.ts';
import { Modes, PaletteNames } from './palette.ts';

/**
 * Contrast is a property of a palette, not of a page (#108). This is the one
 * table of every pairing the interface relies on, checked against the default
 * palette and every season's in both modes by paletteContrast.test.ts, so a
 * season that would fail axe somewhere can't ship anywhere.
 */

/** WCAG 2.2 AA minimum contrast for normal-size text. */
export const AA_TEXT = 4.5;

/** WCAG 2.2 AA (1.4.11) minimum contrast for non-text UI parts. */
export const NON_TEXT = 3.0;

/** A palette color: a raw pair in the mode being checked, or pinned to one
 *  mode (a salient button's label is literal black in both). */
export type ColorRef = PaletteName | { name: PaletteName; mode: Mode };

/** What a color is painted on: an opaque pair, or a translucent tint
 *  composited over one, as the browser paints a selection. */
export type Surface = ColorRef | { tint: PaletteName; over: PaletteName };

export type RolePair = {
    ink: ColorRef;
    on: Surface;
    minimum: number;
    /** Where the interface paints this pairing. */
    role: string;
};

const PageSurfaces = ['white', 'very-light-grey'] as const;

const TextInks: PaletteName[] = [
    'black',
    'gold-text',
    'grey-text',
    'blue-text',
    'orange-text',
];

/** The fills the focus band must stand out against (`saturated-surface`). */
const SaturatedFills: PaletteName[] = ['orange-text', 'yellow', 'pink'];

export const RolePairs: RolePair[] = [
    ...TextInks.flatMap((ink) =>
        PageSurfaces.map((on) => ({
            ink,
            on,
            minimum: AA_TEXT,
            role: 'text on the page and alternating rows',
        })),
    ),
    {
        ink: 'black',
        on: 'pressed',
        minimum: AA_TEXT,
        role: 'a pressed toggle’s label',
    },
    {
        ink: 'gold-text',
        on: { tint: 'yellow-transparent', over: 'white' },
        minimum: AA_TEXT,
        role: 'a link on a hovered or chosen tile’s selection tint',
    },
    {
        ink: { name: 'black', mode: 'light' },
        on: 'yellow',
        minimum: AA_TEXT,
        role: 'a salient button or highlight surface label, literal black',
    },
    {
        ink: 'white',
        on: 'orange-text',
        minimum: AA_TEXT,
        role: 'error text on the error background',
    },
    {
        ink: 'white',
        on: 'purple',
        minimum: AA_TEXT,
        role: 'token text painted the background on a sounding note',
    },
    ...PageSurfaces.map((on) => ({
        ink: 'focus-blue' as const,
        on,
        minimum: NON_TEXT,
        role: 'the focus ring on the page',
    })),
    {
        ink: 'black',
        on: 'focus-blue',
        minimum: AA_TEXT,
        role: 'a focused button’s label',
    },
    ...['focus-blue' as const, ...SaturatedFills].map((on) => ({
        ink: 'white' as const,
        on,
        minimum: NON_TEXT,
        role: 'the focus band against the ring and saturated fills',
    })),
];

function channels(hex: Hex): [number, number, number] {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}

/** Composite a translucent color over an opaque one, as the browser paints it. */
export function composite(top: Hex, bottom: Hex): Hex {
    const alpha = top.length === 9 ? parseInt(top.slice(7, 9), 16) / 255 : 1;
    const [tr, tg, tb] = channels(top);
    const [br, bg, bb] = channels(bottom);
    const mix = (t: number, b: number) =>
        Math.round(t * alpha + b * (1 - alpha))
            .toString(16)
            .padStart(2, '0');
    return `#${mix(tr, br)}${mix(tg, bg)}${mix(tb, bb)}`;
}

export function resolveColor(palette: Palette, ref: ColorRef, mode: Mode): Hex {
    return typeof ref === 'string'
        ? palette[ref][mode]
        : palette[ref.name][ref.mode];
}

export function resolveSurface(
    palette: Palette,
    surface: Surface,
    mode: Mode,
): Hex {
    return typeof surface === 'object' && 'tint' in surface
        ? composite(palette[surface.tint][mode], palette[surface.over][mode])
        : resolveColor(palette, surface, mode);
}

export function describeRef(ref: Surface): string {
    return typeof ref === 'string'
        ? ref
        : 'tint' in ref
          ? `${ref.tint} over ${ref.over}`
          : `${ref.name} (${ref.mode})`;
}

export type ContrastFailure = {
    mode: Mode;
    ink: string;
    on: string;
    ratio: number;
    minimum: number;
    role: string;
};

/** Every role pair this palette fails, in both modes. */
export function checkRolePairs(palette: Palette): ContrastFailure[] {
    return Modes.flatMap((mode) =>
        RolePairs.flatMap((pair) => {
            const ratio = contrast(
                resolveColor(palette, pair.ink, mode),
                resolveSurface(palette, pair.on, mode),
            );
            return ratio >= pair.minimum
                ? []
                : [
                      {
                          mode,
                          ink: describeRef(pair.ink),
                          on: describeRef(pair.on),
                          ratio,
                          minimum: pair.minimum,
                          role: pair.role,
                      },
                  ];
        }),
    );
}

/** The level a ratio reaches: AA text, non-text, or neither. */
function level(ratio: number): number {
    return ratio >= AA_TEXT ? AA_TEXT : ratio >= NON_TEXT ? NON_TEXT : 0;
}

/**
 * A season may not take any color below the level it reaches on the page
 * with the default palette. The role table above lists what is known; this
 * covers what isn't, since a brand hue painted as text or an indicator
 * somewhere nobody wrote down is exactly what a recolor would break.
 */
export function checkNoRegression(
    defaults: Palette,
    palette: Palette,
): ContrastFailure[] {
    const surfaces: PaletteName[] = ['white', 'very-light-grey', 'pressed'];
    return Modes.flatMap((mode) =>
        surfaces.flatMap((on) =>
            PaletteNames.filter(
                (ink) => ink !== on && palette[ink][mode].length === 7,
            ).flatMap((ink) => {
                const required = level(
                    contrast(defaults[ink][mode], defaults[on][mode]),
                );
                const ratio = contrast(palette[ink][mode], palette[on][mode]);
                return ratio >= required
                    ? []
                    : [
                          {
                              mode,
                              ink,
                              on,
                              ratio,
                              minimum: required,
                              role: 'no worse than the default palette',
                          },
                      ];
            }),
        ),
    );
}
