import { expect, test } from 'vitest';
import {
    colorToWordplay,
    colorsToSource,
    DefaultResolution,
    estimateBytes,
    MaxResolution,
    MinResolution,
    ResolutionStep,
} from '@edit/image/imageToColors';
import evaluateCode from '@runtime/evaluate';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';

test('a color is written the way Camera writes one', () => {
    // Integers throughout, and a hue that carries its unit — without the degrees,
    // binding it to a Color raises an incompatible-values exception.
    expect(colorToWordplay(255, 0, 0)).toMatch(/^🌈\(\d+% \d+ \d+°\)$/);
    // Black and white are achromatic; a NaN hue is pinned to zero rather than written out.
    expect(colorToWordplay(0, 0, 0)).toBe('🌈(0% 0 0°)');
    expect(colorToWordplay(255, 255, 255)).toBe('🌈(100% 0 0°)');
});

/** A 2x1 image: one red pixel, one blue. */
const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]);

test('a picture parses as a list of rows of colors', () => {
    const source = colorsToSource(rgba, 2, 1, 'cat.jpg, 2 by 1 colors');
    const program = parseProgram(toTokens(source));
    expect(
        program
            .nodes()
            .filter((n) => n.constructor.name.includes('Unparsable')),
    ).toHaveLength(0);
});

test("the doc is the source's own, not the list's", () => {
    const source = colorsToSource(rgba, 2, 1, 'cat.jpg');
    // The blank line is what decides that (#1374); without it the doc documents the list
    // and the project loses its gallery description.
    expect(source).toMatch(/^¶cat\.jpg¶\n\n\[/);
});

test('every row is a line, so a square is findable', () => {
    const source = colorsToSource(new Uint8ClampedArray(4 * 4 * 4), 4, 4, 'x');
    expect(source.split('\n').filter((l) => l.startsWith('\t[')).length).toBe(
        4,
    );
});

test('the byte estimate is not an underestimate', () => {
    const source = colorsToSource(rgba, 2, 1, '');
    expect(estimateBytes(2, 1)).toBeGreaterThanOrEqual(
        new TextEncoder().encode(source).length - 3,
    );
});

test('every slider step is a resolution', () => {
    expect(DefaultResolution).toBeGreaterThanOrEqual(MinResolution);
    expect(DefaultResolution).toBeLessThanOrEqual(MaxResolution);
    // Every step the slider can stop on is a resolution, the default included.
    expect(DefaultResolution % ResolutionStep).toBe(0);
    expect(MinResolution % ResolutionStep).toBe(0);
    expect(MaxResolution % ResolutionStep).toBe(0);
});

test('a generated picture evaluates to a grid an Image will take', () => {
    // Two rows of three, so a ragged or transposed result would show.
    const source = colorsToSource(
        new Uint8ClampedArray(3 * 2 * 4).fill(200),
        3,
        2,
        'a picture',
    );
    const value = evaluateCode(source);
    expect(value?.toString().startsWith('[[')).toBe(true);
    // And an Image built from it reports the shape the picture had.
    const grid = source.slice(source.indexOf('['));
    expect(
        evaluateCode(`Image(${grid} "a picture").colors.length()`)?.toString(),
    ).toBe('2');
});
