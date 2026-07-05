import { FallbackFaceNames } from './faces.generated';

/**
 * The fallback font-family list as a CSS literal — the same names, order, and
 * quoting as the --wordplay-fallback-fonts custom property defined in
 * static/fonts/fonts-fallback.css. Stylesheets should use the CSS variable; this
 * literal is for places CSS variables can't reach (canvas font strings).
 *
 * This is the ONLY fallback-face data the runtime needs — just the family names.
 * The structured table (scripts/weights/unicode-ranges) is test-only
 * (faces.fallback.generated.ts); fallback glyph loading is driven by the CSS
 * @font-face rules in fonts-fallback.css, not by JS.
 */
export const FallbackFontFamilies = FallbackFaceNames.map(
    (name) => `"${name}"`,
).join(', ');
