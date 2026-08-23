/**
 * Turning pixels into a character composition — used by the symbol tool's
 * "pixels" mode and by image import (#739).
 *
 * Separate from Character.ts for the same reason paths.ts is: only the character
 * editor rasterizes, and this reaches the full color conversion rather than the
 * small LCH helper Character.ts limits itself to.
 */
import { RGBtoLCH } from '@output/Color/ColorJS';
import {
    CharacterSize,
    type CharacterPixel,
    type CharacterShape,
} from '@db/characters/Character';

/**
 * How much of a cell must be covered for it to become a pixel.
 *
 * A character has no alpha channel — a pixel's fill is an opaque color — so
 * half coverage is the only honest cutoff for an antialiased edge. Treating any
 * coverage at all as opaque (which is what emoji import used to do) grows every
 * silhouette by a cell and leaves a halo around it.
 */
export const MinimumAlpha = 0.5;

/**
 * Convert a block of RGBA samples into character pixels.
 *
 * Colors are averaged weighted by alpha, so transparent samples don't drag an
 * edge toward whatever RGB happens to sit behind them (usually black). A cell
 * whose mean coverage is below the threshold produces no pixel at all, leaving
 * the grid empty rather than painting it.
 */
export function pixelsFromRGBA(
    rgba: Uint8ClampedArray,
    grid: number = CharacterSize,
    minimumAlpha: number = MinimumAlpha,
): CharacterPixel[] {
    const pixels: CharacterPixel[] = [];
    for (let y = 0; y < grid; y++)
        for (let x = 0; x < grid; x++) {
            const index = (y * grid + x) * 4;
            const alpha = (rgba[index + 3] ?? 0) / 255;
            if (alpha < minimumAlpha) continue;
            pixels.push({
                type: 'pixel',
                point: { x, y },
                fill: toLCH(
                    (rgba[index] ?? 0) / 255,
                    (rgba[index + 1] ?? 0) / 255,
                    (rgba[index + 2] ?? 0) / 255,
                ),
            });
        }
    return pixels;
}

/** An LCH color a character can store, with the hue an achromatic color leaves
 *  as NaN pinned to zero. */
export function toLCH(
    red: number,
    green: number,
    blue: number,
): CharacterPixel['fill'] {
    const color = RGBtoLCH(red, green, blue);
    const hue = color.coords[2] ?? 0;
    return {
        l: (color.coords[0] ?? 0) / 100,
        c: color.coords[1] ?? 0,
        h: isNaN(hue) ? 0 : hue,
    };
}

/**
 * Replace a composition's pixel layer, keeping every other shape above it.
 *
 * Imported pixels go *first* because that is what gets painted first: appended,
 * a 32x32 import covered whatever a creator had already drawn, which reads as
 * having deleted it. Both ways of importing share this so they behave the same;
 * the pixel brush still appends, so a stroke drawn by hand lands on top.
 */
export function withPixelLayer(
    shapes: CharacterShape[],
    pixels: CharacterPixel[],
): CharacterShape[] {
    return [...pixels, ...shapes.filter((s) => s.type !== 'pixel')];
}

/** A square selection over a source image, in source pixels. */
export type Crop = { x: number; y: number; size: number };

/** Keep a crop box square and inside the image. */
export function clampCrop(crop: Crop, width: number, height: number): Crop {
    const size = Math.max(1, Math.min(crop.size, width, height));
    return {
        size,
        x: Math.max(0, Math.min(Math.round(crop.x), width - size)),
        y: Math.max(0, Math.min(Math.round(crop.y), height - size)),
    };
}

/**
 * Average a square region of an RGBA image down to grid x grid RGBA.
 *
 * A box filter, not point sampling: a photo reduced to 32x32 by taking one
 * source pixel per cell aliases into noise, while averaging the whole cell
 * keeps what the image actually looks like. Color is accumulated premultiplied
 * by alpha for the same reason pixelsFromRGBA divides by it.
 */
export function boxSample(
    source: Uint8ClampedArray,
    sourceWidth: number,
    sourceHeight: number,
    crop: Crop,
    grid: number = CharacterSize,
): Uint8ClampedArray {
    const out = new Uint8ClampedArray(grid * grid * 4);
    const step = crop.size / grid;
    for (let cellY = 0; cellY < grid; cellY++)
        for (let cellX = 0; cellX < grid; cellX++) {
            const fromX = Math.floor(crop.x + cellX * step);
            const fromY = Math.floor(crop.y + cellY * step);
            // At least one sample per cell, even when the crop is smaller than
            // the grid and a cell spans less than a source pixel.
            const toX = Math.max(
                fromX + 1,
                Math.floor(crop.x + (cellX + 1) * step),
            );
            const toY = Math.max(
                fromY + 1,
                Math.floor(crop.y + (cellY + 1) * step),
            );

            let red = 0;
            let green = 0;
            let blue = 0;
            let alpha = 0;
            let samples = 0;
            for (let y = fromY; y < toY; y++)
                for (let x = fromX; x < toX; x++) {
                    if (x < 0 || x >= sourceWidth || y < 0 || y >= sourceHeight)
                        continue;
                    const index = (y * sourceWidth + x) * 4;
                    const a = source[index + 3] ?? 0;
                    red += (source[index] ?? 0) * a;
                    green += (source[index + 1] ?? 0) * a;
                    blue += (source[index + 2] ?? 0) * a;
                    alpha += a;
                    samples++;
                }

            const index = (cellY * grid + cellX) * 4;
            if (samples === 0 || alpha === 0) {
                out[index + 3] = 0;
                continue;
            }
            out[index] = red / alpha;
            out[index + 1] = green / alpha;
            out[index + 2] = blue / alpha;
            out[index + 3] = alpha / samples;
        }
    return out;
}
