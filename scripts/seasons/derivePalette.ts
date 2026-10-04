/**
 * Suggests a season's palette from a hue for each role (#108). Contrast depends
 * on luminance alone, so each suggested color keeps the luminance the default
 * palette uses in that role, rescaled for the season's tinted page — which is
 * what lets a whole palette change hue and still pass every check in
 * src/seasons/rolePairs.ts.
 *
 * The output is a starting point to paste into src/seasons/palettes.ts and
 * adjust by eye; paletteContrast.test.ts stays the gate.
 *
 *   npx tsx scripts/seasons/derivePalette.ts            # every season
 *   npx tsx scripts/seasons/derivePalette.ts winter     # one season
 */
import { isSeason, Seasons, type Season } from '#seasons/Season.ts';
import type {
    Hex,
    Mode,
    Pair,
    Palette,
    PaletteOverride,
    SeasonalName,
} from '#seasons/palette.ts';
import { readDefaultPalette } from '#seasons/readDefaultPalette.ts';
import { checkNoRegression, checkRolePairs } from '#seasons/rolePairs.ts';
import { luminance } from '#util/colorContrast.ts';

/** OKLCH hues (degrees) for each role, and how strongly to tint the page. */
type Intent = {
    highlight: number;
    blue: number;
    purple: number;
    pink: number;
    orange: number;
    tint: number;
    tintChroma: number;
};

const Intents: Record<Season, Intent> = {
    wet: {
        highlight: 165,
        blue: 235,
        purple: 305,
        pink: 350,
        orange: 60,
        tint: 160,
        tintChroma: 0.02,
    },
    dry: {
        highlight: 100,
        blue: 240,
        purple: 305,
        pink: 20,
        orange: 50,
        tint: 80,
        tintChroma: 0.025,
    },
    hot: {
        highlight: 66,
        blue: 205,
        purple: 330,
        pink: 25,
        orange: 40,
        tint: 70,
        tintChroma: 0.03,
    },
    cool: {
        highlight: 292,
        blue: 272,
        purple: 292,
        pink: 355,
        orange: 55,
        tint: 275,
        tintChroma: 0.018,
    },
    spring: {
        highlight: 350,
        blue: 245,
        purple: 305,
        pink: 340,
        orange: 65,
        tint: 350,
        tintChroma: 0.015,
    },
    summer: {
        highlight: 12,
        blue: 232,
        purple: 300,
        pink: 5,
        orange: 50,
        tint: 95,
        tintChroma: 0.02,
    },
    autumn: {
        highlight: 44,
        blue: 255,
        purple: 325,
        pink: 18,
        orange: 50,
        tint: 60,
        tintChroma: 0.025,
    },
    winter: {
        highlight: 215,
        blue: 258,
        purple: 285,
        pink: 345,
        orange: 50,
        tint: 240,
        tintChroma: 0.015,
    },
    polarDay: {
        highlight: 85,
        blue: 222,
        purple: 280,
        pink: 0,
        orange: 60,
        tint: 220,
        tintChroma: 0.012,
    },
    polarNight: {
        highlight: 155,
        blue: 268,
        purple: 300,
        pink: 330,
        orange: 55,
        tint: 255,
        tintChroma: 0.02,
    },
};

/** How saturated the brand hues are, before the gamut forces it lower. */
const Chroma = 0.16;

/** The tinted page's luminance in each mode; the default page is 1 and 0. */
const PageLuminance: Record<Mode, number> = { light: 0.965, dark: 0.006 };

type RGB = { r: number; g: number; b: number };

function oklchToLinear(L: number, C: number, h: number): RGB {
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return {
        r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    };
}

function inGamut({ r, g, b }: RGB): boolean {
    return [r, g, b].every((v) => v >= -0.0005 && v <= 1.0005);
}

function toHex({ r, g, b }: RGB): Hex {
    const channel = (v: number) => {
        const c = Math.min(1, Math.max(0, v));
        const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
        return Math.round(s * 255)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** The in-gamut color of hue `h` with relative luminance `target`, at the
 *  highest chroma up to `chroma` the gamut allows. */
function solve(h: number, chroma: number, target: number): Hex {
    for (let c = chroma; c >= 0; c -= 0.005) {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 40; i++) {
            const mid = (lo + hi) / 2;
            const { r, g, b } = oklchToLinear(mid, c, h);
            if (0.2126 * r + 0.7152 * g + 0.0722 * b < target) lo = mid;
            else hi = mid;
        }
        const rgb = oklchToLinear(lo, c, h);
        if (inGamut(rgb)) return toHex(rgb);
    }
    return toHex(oklchToLinear(target ** (1 / 3), 0, h));
}

const Surfaces: readonly SeasonalName[] = [
    'white',
    'very-light-grey',
    'pressed',
    'light-grey',
    'dark-grey',
];

function derive(defaults: Palette, intent: Intent): PaletteOverride {
    // Rescale each default luminance so its contrast with the tinted page is
    // what it was against pure white or black; inks get a little margin.
    const target = (name: SeasonalName, mode: Mode) => {
        if (name === 'white') return PageLuminance[mode];
        const scale =
            mode === 'light'
                ? (PageLuminance.light + 0.05) / 1.05
                : (PageLuminance.dark + 0.05) / 0.05;
        const L = (luminance(defaults[name][mode]) + 0.05) * scale - 0.05;
        if (Surfaces.includes(name)) return L;
        return Math.max(0, L) * (mode === 'light' ? 0.97 : 1.03);
    };
    const pair = (name: SeasonalName, h: number, chroma: number): Pair => ({
        light: solve(h, chroma, target(name, 'light')),
        dark: solve(h, chroma, target(name, 'dark')),
    });
    // The selection tint keeps the default's alpha, on a base of the default's
    // luminance less a margin, since a link of the same hue must sit on it.
    const tint = defaults['yellow-transparent'];
    return {
        blue: pair('blue', intent.blue, Chroma),
        purple: pair('purple', intent.purple, Chroma),
        pink: pair('pink', intent.pink, Chroma),
        orange: pair('orange', intent.orange, Chroma + 0.04),
        yellow: pair('yellow', intent.highlight, Chroma),
        'yellow-transparent': {
            light:
                solve(intent.highlight, Chroma, luminance('#ffb000') * 0.85) +
                tint.light.slice(7),
            dark:
                solve(intent.highlight, Chroma, luminance('#b67c00') * 0.85) +
                tint.dark.slice(7),
        },
        'gold-text': pair('gold-text', intent.highlight, Chroma),
        'blue-text': pair('blue-text', intent.blue, Chroma),
        'grey-text': pair('grey-text', intent.tint, 0.02),
        white: pair('white', intent.tint, intent.tintChroma),
        'very-light-grey': pair(
            'very-light-grey',
            intent.tint,
            intent.tintChroma * 1.5,
        ),
        'light-grey': pair('light-grey', intent.tint, 0.03),
        'dark-grey': pair('dark-grey', intent.tint, 0.03),
        pressed: pair('pressed', intent.tint, intent.tintChroma * 2),
    };
}

const defaults = readDefaultPalette();
const requested = process.argv[2];
const seasons = isSeason(requested) ? [requested] : Seasons;

for (const season of seasons) {
    const override = derive(defaults, Intents[season]);
    const palette: Palette = { ...defaults, ...override };
    const failures = [
        ...checkRolePairs(palette),
        ...checkNoRegression(defaults, palette),
    ];
    console.log(`    ${season}: {`);
    for (const [name, pair] of Object.entries(override))
        console.log(
            `        '${name}': { light: '${pair.light}', dark: '${pair.dark}' },`,
        );
    console.log('    },');
    for (const f of failures)
        console.error(
            `  ✗ ${season} ${f.mode}: ${f.ink} on ${f.on} is ${f.ratio.toFixed(2)}, needs ${f.minimum}`,
        );
}
