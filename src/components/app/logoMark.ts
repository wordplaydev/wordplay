/**
 * The single source of geometry for the Wordplay logo mark: a speech bubble
 * whose interior is a tiny stage holding either one bold glyph or the three
 * typing dots. Both the Logo component and the static-asset generator in
 * scripts/logo/ read these constants, so the on-screen mark and the
 * rasterized icons can never diverge.
 *
 * The mark never depicts motion in its drawing; motion is behavioral (glyph
 * cycling, dot pulsing) and gated by --animation-factor elsewhere.
 */

export const LOGO_VIEWBOX = '0 0 96 96';

/** An outlined speech bubble with a swept tail at the lower left. The body
 *  is a true ellipse (center 48,44, radii 36×30, quarter-arc kappa 0.5523);
 *  the tail exits at (37.8, 72.8) and rejoins ON the ellipse at (22, 64.8)
 *  with a tangent-continuous control point, so the outline reads as one
 *  smooth ellipse interrupted by the tail. */
export const LOGO_BUBBLE_PATH =
    'M48 14C67.9 14 84 27.4 84 44C84 60.6 67.9 74 48 74C44.6 74 41.1 73.6 37.8 72.8C33 79 25 84 16 86C20.5 80.5 25 67.4 22 64.8C15.6 59.2 12 51.7 12 44C12 27.4 28.1 14 48 14Z';

/** Matched to Noto Sans 400's stem width (0.088em) at the glyph size below,
 *  so the bubble reads as a normal-weight glyph of the font, not a bold one. */
export const LOGO_STROKE_WIDTH = 3.5;

/** The visual center of the bubble body (its ellipse spans x 12–84, y 14–74).
 *  Glyphs and dots are centered here, and the glyph's tilt rotates about this
 *  point so tilting never shifts the optical center. */
export const LOGO_CENTER_X = 48;
export const LOGO_CENTER_Y = 44;

/** The playful tilt of the glyph on its stage, in degrees. */
export const LOGO_GLYPH_ROTATION = -8;

/** Glyph font size in viewBox units, sized to sit comfortably inside the
 *  bubble's ~56-unit inner height. */
export const LOGO_GLYPH_SIZE = 40;

/** Short glyphs (an x-height 'a', 'α') are enlarged until their ink is
 *  roughly this tall, so every script fills the bubble similarly instead of
 *  x-height letters floating in empty space. Tall glyphs (文, अ) already
 *  exceed it and keep LOGO_GLYPH_SIZE. */
export const LOGO_TARGET_INK_HEIGHT = 34;
/** Never let the enlarged ink grow wider than this. */
export const LOGO_TARGET_INK_WIDTH = 44;
/** Cap on the enlargement, so upscaled glyph stems don't drift too far from
 *  the bubble's stroke weight. */
export const LOGO_MAX_GLYPH_SCALE = 1.45;

/**
 * The shapes face: a circle, triangle, and square — the primitives of
 * programmable output — laid out on an invisible horizontal alignment line,
 * tilted at the glyph angle. The circle is vertically centered on the line,
 * the triangle's base sits on it, and the square's top hangs just below it
 * (lifted slightly so its rotated corner keeps clear of the bubble). The
 * shapes are drawn axis-aligned inside a group rotated about the bubble
 * center, which both tilts each shape and tilts the line they share.
 *
 * The line sits at y 41, above the bubble's center: the −8° rotation about
 * (48, 44) lowers the left-side circle ~3 units, so the raise lands the
 * rendered circle back on the ellipse's midline.
 *
 * Horizontal layout: widths 14 (circle) + 15 (triangle) + 12.5 (square)
 * with equal 5-unit gaps = 51.5 units, centered on x 48 → left edge 22.25,
 * leaving ~8.5 units to the bubble's inner edge on both sides so nothing
 * bleeds into the stroke at favicon scale.
 */
export const LOGO_SHAPE_LINE_Y = 41;
export const LOGO_SHAPE_CIRCLE = { cx: 29.25, r: 7 };
export const LOGO_SHAPE_TRIANGLE = {
    left: 41.25,
    right: 56.25,
    apexX: 48.75,
    apexY: 28,
};
export const LOGO_SHAPE_SQUARE = { x: 61.25, top: 38.5, side: 12.5 };

/** The glyph shown when the viewer's dominant script has no exemplar. */
export const DEFAULT_LOGO_GLYPH = 'a';

/** What the bubble is saying: a single glyph, or the circle/triangle/square
 *  shapes face used on static surfaces and while loading. */
export type LogoFace = { glyph: string } | 'shapes';

/**
 * The mark's bubble and interior as an SVG fragment, colored by the
 * surrounding currentColor. Shared by renderLogoSVG and the generator's
 * composite images (e.g. the social card).
 */
export function renderLogoGroup(face: LogoFace, fontFamily?: string): string {
    const bubble = `<path d="${LOGO_BUBBLE_PATH}" fill="none" stroke="currentColor" stroke-width="${LOGO_STROKE_WIDTH}" stroke-linejoin="round" stroke-linecap="round"/>`;
    const contents =
        face === 'shapes'
            ? `<g fill="currentColor" transform="rotate(${LOGO_GLYPH_ROTATION} ${LOGO_CENTER_X} ${LOGO_CENTER_Y})">` +
              `<circle cx="${LOGO_SHAPE_CIRCLE.cx}" cy="${LOGO_SHAPE_LINE_Y}" r="${LOGO_SHAPE_CIRCLE.r}"/>` +
              `<polygon points="${LOGO_SHAPE_TRIANGLE.left},${LOGO_SHAPE_LINE_Y} ${LOGO_SHAPE_TRIANGLE.right},${LOGO_SHAPE_LINE_Y} ${LOGO_SHAPE_TRIANGLE.apexX},${LOGO_SHAPE_TRIANGLE.apexY}"/>` +
              `<rect x="${LOGO_SHAPE_SQUARE.x}" y="${LOGO_SHAPE_SQUARE.top}" width="${LOGO_SHAPE_SQUARE.side}" height="${LOGO_SHAPE_SQUARE.side}"/>` +
              `</g>`
            : `<text x="${LOGO_CENTER_X}" y="${LOGO_CENTER_Y}" text-anchor="middle" dominant-baseline="central" transform="rotate(${LOGO_GLYPH_ROTATION} ${LOGO_CENTER_X} ${LOGO_CENTER_Y})" font-size="${LOGO_GLYPH_SIZE}" font-weight="400"${fontFamily === undefined ? '' : ` font-family="${fontFamily}"`} fill="currentColor">${face.glyph}</text>`;
    return bubble + contents;
}

/**
 * Render the mark as a standalone SVG document string. Used by the asset
 * generator (and the noscript fallback in app.html); the Logo component
 * renders the same constants as Svelte markup instead.
 */
export function renderLogoSVG(
    face: LogoFace,
    options: {
        /** Stroke/glyph color, any SVG color. */
        color: string;
        /** Optional opaque background (e.g. for apple-touch-icon). */
        background?: string | undefined;
        /** Extra margin in viewBox units around the 96×96 mark (e.g. the
         *  maskable icon's safe zone). */
        pad?: number | undefined;
        /** Font family for the glyph face; the generator passes the vendored
         *  Noto Sans, the browser resolves the app's Noto cascade. */
        fontFamily?: string | undefined;
        /** Optional color override applied via prefers-color-scheme: dark,
         *  for the adaptive SVG favicon. Ignored by rasterizers. */
        darkColor?: string | undefined;
    },
): string {
    const { color, background, fontFamily, darkColor } = options;
    const pad = options.pad ?? 0;
    const style =
        darkColor === undefined
            ? ''
            : `<style>@media (prefers-color-scheme: dark) { .mark { color: ${darkColor}; } }</style>`;
    const backgroundRect =
        background === undefined
            ? ''
            : `<rect x="${-pad}" y="${-pad}" width="${96 + 2 * pad}" height="${96 + 2 * pad}" fill="${background}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${96 + 2 * pad} ${96 + 2 * pad}">${style}${backgroundRect}<g class="mark" style="color: ${color}">${renderLogoGroup(face, fontFamily)}</g></svg>`;
}
