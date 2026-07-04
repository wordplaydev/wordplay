import type { Script } from '@locale/Scripts';
import { FallbackFaces, type FallbackFace } from './faces.generated';

/**
 * The fallback font-family list as a CSS literal — the same names, order, and
 * quoting as the --wordplay-fallback-fonts custom property defined in
 * static/fonts/fonts-fallback.css. Stylesheets should use the CSS variable; this
 * literal is for places CSS variables can't reach (canvas font strings).
 */
export const FallbackFontFamilies = FallbackFaces.map(
    (face) => `"${face.name}"`,
).join(', ');

/** The first fallback face covering the given script, if any. */
export function getFallbackFaceForScript(
    script: Script,
): FallbackFace | undefined {
    return FallbackFaces.find((face) => face.scripts.includes(script));
}

/** The URLs of the font file(s) declared for the given face and range index,
 * one per weight file, mirroring the naming scheme of getFontFileURL. */
export function getFallbackFontFileURLs(
    face: FallbackFace,
    rangeIndex: number,
): string[] {
    const dir = face.name.replaceAll(/[^A-Za-z0-9]/g, '');
    const keys = Array.isArray(face.weights)
        ? face.weights.map((weight) => `${weight}`)
        : ['all'];
    return keys.map((key) => `/fonts/${dir}/${dir}-${key}-${rangeIndex}.woff2`);
}
