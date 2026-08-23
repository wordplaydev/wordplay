import {
    CharacterSize,
    type CharacterPixel,
    type CharacterShape,
} from '@db/characters/Character';
import {
    boxSample,
    clampCrop,
    MinimumAlpha,
    pixelsFromRGBA,
    withPixelLayer,
} from '@db/characters/raster';
import { describe, expect, test } from 'vitest';

/** Build an RGBA buffer from a width and a per-pixel color function. */
function image(
    width: number,
    height: number,
    at: (x: number, y: number) => [number, number, number, number],
): Uint8ClampedArray {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = at(x, y);
            const index = (y * width + x) * 4;
            data[index] = r;
            data[index + 1] = g;
            data[index + 2] = b;
            data[index + 3] = a;
        }
    return data;
}

const RED: [number, number, number, number] = [255, 0, 0, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];
const WHITE: [number, number, number, number] = [255, 255, 255, 255];

describe('boxSample', () => {
    test('averages a block rather than picking one sample from it', () => {
        // Point sampling a checkerboard down to one cell picks black or white
        // depending on which corner it lands on; averaging gives the grey the
        // image actually is.
        const checker = image(2, 2, (x, y) =>
            (x + y) % 2 === 0 ? WHITE : [0, 0, 0, 255],
        );
        const out = boxSample(checker, 2, 2, { x: 0, y: 0, size: 2 }, 1);
        expect(out[0]).toBeGreaterThan(100);
        expect(out[0]).toBeLessThan(155);
        expect(out[3]).toBe(255);
    });

    test('a 4x4 reduces to 2x2 by quadrant', () => {
        // Left half red, right half white.
        const source = image(4, 4, (x) => (x < 2 ? RED : WHITE));
        const out = boxSample(source, 4, 4, { x: 0, y: 0, size: 4 }, 2);
        expect([out[0], out[1], out[2]]).toEqual([255, 0, 0]);
        expect([out[4], out[5], out[6]]).toEqual([255, 255, 255]);
    });

    test('weights color by alpha, so transparency does not darken an edge', () => {
        // One opaque red plus three fully transparent blacks. A plain mean of
        // the RGB channels would give a quarter-strength dark red; weighting by
        // alpha keeps the only color actually present.
        const source = image(2, 2, (x, y) =>
            x === 0 && y === 0 ? RED : CLEAR,
        );
        const out = boxSample(source, 2, 2, { x: 0, y: 0, size: 2 }, 1);
        expect([out[0], out[1], out[2]]).toEqual([255, 0, 0]);
        // A quarter covered.
        expect(out[3]).toBeGreaterThan(60);
        expect(out[3]).toBeLessThan(70);
    });

    test('samples outside the image contribute nothing', () => {
        const source = image(2, 2, () => RED);
        const out = boxSample(source, 2, 2, { x: 1, y: 1, size: 2 }, 1);
        expect(out[3]).toBe(255);
    });
});

describe('pixelsFromRGBA', () => {
    test('a fully transparent block produces no pixels at all', () => {
        // Not black pixels: a character has no alpha, so an uncovered cell has
        // to be absent, letting the grid show through.
        const clear = new Uint8ClampedArray(4 * 4 * 4);
        expect(pixelsFromRGBA(clear, 4)).toEqual([]);
    });

    test('a cell under half covered is dropped, one over is kept', () => {
        const under = image(1, 1, () => [255, 0, 0, Math.floor(255 * 0.4)]);
        const over = image(1, 1, () => [255, 0, 0, Math.floor(255 * 0.6)]);
        expect(pixelsFromRGBA(under, 1)).toHaveLength(0);
        expect(pixelsFromRGBA(over, 1)).toHaveLength(1);
    });

    test('maps row-major samples to grid positions', () => {
        // Only the cell at (1,0) is opaque.
        const source = image(2, 2, (x, y) =>
            x === 1 && y === 0 ? RED : CLEAR,
        );
        const pixels = pixelsFromRGBA(source, 2);
        expect(pixels).toHaveLength(1);
        expect(pixels[0].point).toEqual({ x: 1, y: 0 });
    });

    test('an achromatic color gets a real hue, not NaN', () => {
        // Grey has no hue; storing NaN would fail the schema and break the SVG.
        const grey = image(1, 1, () => [128, 128, 128, 255]);
        const fill = pixelsFromRGBA(grey, 1)[0].fill;
        expect(fill).not.toBeNull();
        expect(Number.isNaN(fill?.h)).toBe(false);
    });

    test('the threshold is the documented one', () => {
        expect(MinimumAlpha).toBe(0.5);
    });

    test('a full grid yields one pixel per cell', () => {
        const full = image(CharacterSize, CharacterSize, () => RED);
        expect(pixelsFromRGBA(full)).toHaveLength(
            CharacterSize * CharacterSize,
        );
    });
});

describe('clampCrop', () => {
    test('keeps the box inside the image', () => {
        expect(clampCrop({ x: -5, y: 99, size: 10 }, 20, 20)).toEqual({
            x: 0,
            y: 10,
            size: 10,
        });
    });

    test('caps the size at the shorter side, so the box stays square', () => {
        expect(clampCrop({ x: 0, y: 0, size: 500 }, 40, 20)).toEqual({
            x: 0,
            y: 0,
            size: 20,
        });
    });

    test('never produces an empty box', () => {
        expect(clampCrop({ x: 0, y: 0, size: 0 }, 10, 10).size).toBe(1);
    });
});

describe('withPixelLayer', () => {
    const pixel = (x: number): CharacterPixel => ({
        type: 'pixel',
        point: { x, y: 0 },
        fill: null,
    });
    const drawnPath: CharacterShape = {
        type: 'path',
        closed: false,
        points: [
            { x: 0, y: 0 },
            { x: 4, y: 4 },
        ],
    };
    const drawnRect: CharacterShape = {
        type: 'rect',
        point: { x: 1, y: 1 },
        width: 3,
        height: 3,
    };

    test('imported pixels sit below every other shape', () => {
        // The regression: an import was appended, and shapes paint in array
        // order, so a thousand opaque pixels covered the path a creator had
        // already drawn. It looked like the import had deleted it.
        const result = withPixelLayer(
            [drawnPath, pixel(0), drawnRect],
            [pixel(5), pixel(6)],
        );
        expect(result.slice(0, 2).every((s) => s.type === 'pixel')).toBe(true);
        expect(result.slice(2)).toEqual([drawnPath, drawnRect]);
    });

    test('it replaces the pixel layer rather than adding to it', () => {
        const result = withPixelLayer(
            [pixel(0), pixel(1), drawnPath],
            [pixel(9)],
        );
        expect(result.filter((s) => s.type === 'pixel')).toEqual([pixel(9)]);
    });

    test('it keeps every shape that is not a pixel', () => {
        const result = withPixelLayer([drawnPath, drawnRect], [pixel(0)]);
        expect(result).toContain(drawnPath);
        expect(result).toContain(drawnRect);
    });

    test('it does not mutate the shapes it was given', () => {
        const shapes: CharacterShape[] = [drawnPath, pixel(0)];
        withPixelLayer(shapes, [pixel(7)]);
        expect(shapes).toEqual([drawnPath, pixel(0)]);
    });
});
