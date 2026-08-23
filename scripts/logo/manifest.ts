/**
 * The declarative list of every generated logo asset. `npm run logo-fix`
 * renders these from src/components/app/logoMark.ts (the single source of
 * logo geometry) and records hashes in logo.lock.json; `npm run logo` and
 * logoSync.test.ts verify nothing drifted.
 *
 * All static surfaces show the typing-dots face — the bubble "about to say
 * something" — because favicons and share images can't know the viewer's
 * script; in-app surfaces localize the glyph instead.
 */

import { Cast } from '../../src/components/app/cast';

/** Light-mode palette values, matching --white-light/--black-light in
 *  src/app.html (paletteContrast.test.ts guards the originals). */
export const LIGHT_BACKGROUND = '#ffffff';
export const LIGHT_FOREGROUND = '#000000';
/** Dark-mode equivalents, matching --white-dark/--black-dark. */
export const DARK_BACKGROUND = '#000000';
export const DARK_FOREGROUND = '#ffffff';

export type LogoRaster = {
    /** Repo-relative output path. */
    file: string;
    /** Square raster size in pixels. */
    size: number;
    /** Opaque background, or transparent when omitted. */
    background?: string;
    /** Extra safe-zone margin in viewBox units (maskable icons). */
    pad?: number;
};

/** Square rasters of the dots-face mark. */
export const Rasters: LogoRaster[] = [
    { file: 'static/icons/favicon-16x16.png', size: 16 },
    { file: 'static/icons/favicon-32x32.png', size: 32 },
    {
        file: 'static/icons/apple-touch-icon.png',
        size: 180,
        background: LIGHT_BACKGROUND,
    },
    {
        file: 'static/icons/android-chrome-192x192.png',
        size: 192,
        background: LIGHT_BACKGROUND,
    },
    {
        file: 'static/icons/android-chrome-512x512.png',
        size: 512,
        background: LIGHT_BACKGROUND,
    },
    {
        file: 'static/icons/maskable-512x512.png',
        size: 512,
        background: LIGHT_BACKGROUND,
        // The mark occupies the central ~67% of the canvas, inside the 80%
        // maskable safe zone.
        pad: 21,
    },
    // Kept for stability of old external links to the former og:image.
    { file: 'static/icons/icon.png', size: 512 },
];

/** The favicon.ico's embedded PNG sizes. */
export const IcoSizes = [16, 32, 48];
export const IcoPath = 'static/icons/favicon.ico';

/** The adaptive SVG favicon (light/dark via prefers-color-scheme). */
export const SvgPath = 'static/icons/logo.svg';

/** The social share card. */
export const CardPath = 'static/icons/og-card.png';
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const CARD_WORDMARK = 'Wordplay';

/** The vendored face for the card's wordmark text (resvg cannot read the
 *  woff2 slices in static/fonts). Noto Sans Bold — the wordmark stays bold,
 *  like the site's headings; only the mark itself is regular-weight. SIL OFL
 *  1.1; see static/fonts/License.txt. */
export const CardFontPath = 'scripts/logo/fonts/NotoSans-700.ttf';

/** The monochrome emoji face for the card's ensemble cast. SIL OFL 1.1. */
export const EmojiFontPath = 'scripts/logo/fonts/NotoEmoji-400.ttf';

/** The ensemble cast scattered behind the card's lockup, shared with the landing
 *  page's stage so the crowd in a link preview is the crowd a visitor lands on.
 *  See src/components/app/cast.ts for what's in it and why. */
export const CARD_CAST = Cast;

/** Inputs whose change must force a regeneration: geometry, this manifest,
 *  the generator itself, and the card font. Hashes are recorded in the lock
 *  and verified by `npm run logo` / logoSync.test.ts. */
export const InputFiles = [
    'src/components/app/logoMark.ts',
    'src/components/app/cast.ts',
    'scripts/logo/manifest.ts',
    'scripts/logo/generate.ts',
    'scripts/logo/ico.ts',
    CardFontPath,
    EmojiFontPath,
];

/** Every generated output, for verification. */
export function outputFiles(): string[] {
    return [...Rasters.map((r) => r.file), IcoPath, SvgPath, CardPath];
}
