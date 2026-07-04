import { expect, test } from 'vitest';
import type { PathCommand } from 'fontkit';
import { glyphPathToPlaces } from '@input/Contour';
import { Faces, getFontFileURL } from '@basis/faces/Fonts';
import evaluateCode from '@runtime/evaluate';

test('Contour evaluates to an empty list with no fonts loaded', () => {
    // Under the test runner there is no window/fetch, so the stream never loads
    // a font and stays at its initial empty value.
    expect(
        evaluateCode('Contour(\'A\' "Noto Sans").length()')?.toWordplay(),
    ).toBe('0');
});

test('glyphPathToPlaces samples a line at the requested spacing', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [0, 100] },
    ];
    // scale 1 (font unit = meter), spacing 1m, length 100 → 100 samples.
    const points = glyphPathToPlaces(commands, 1, 1, 0, 0);
    expect(points).toHaveLength(101); // 1 move + 100
    for (let i = 1; i < points.length; i++)
        expect(points[i].y - points[i - 1].y).toBeCloseTo(1);
});

test('glyphPathToPlaces keeps spacing consistent across segments and operations', () => {
    // A short line, a long line, and a (degenerate-straight) quadratic — all
    // colinear on the y axis — should produce identical point spacing.
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [0, 50] }, // length 50
        { command: 'lineTo', args: [0, 250] }, // length 200
        { command: 'quadraticCurveTo', args: [0, 300, 0, 350] }, // straight, length 100
    ];
    const points = glyphPathToPlaces(commands, 1, 1, 0, 0);
    for (let i = 1; i < points.length; i++)
        expect(points[i].y - points[i - 1].y).toBeCloseTo(1, 5);
});

test('glyphPathToPlaces scales font units to meters and adds the origin offset', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [100, 0] },
    ];
    // scale 0.01 → 100 font units = 1 meter; detail 1 point/m → 1 sample.
    expect(glyphPathToPlaces(commands, 0.01, 1, 5, 7)).toEqual([
        { x: 5, y: 7 },
        { x: 6, y: 7 },
    ]);
});

test('glyphPathToPlaces always samples at least the end of each segment', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [0, 5] },
    ];
    // Spacing larger than the segment still yields the segment endpoint.
    expect(glyphPathToPlaces(commands, 1, 1000, 0, 0)).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 5 },
    ]);
});

test('glyphPathToPlaces clamps zero/negative spacing to the minimum', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [0, 1] },
    ];
    // A length-1 line clamped to the 0.01m floor → 100 samples + 1 move.
    const clamped = glyphPathToPlaces(commands, 1, 0.01, 0, 0);
    expect(clamped).toHaveLength(101);
    // Negative and zero spacing must clamp to the same bounded result, not
    // explode into millions of points (which froze the tab).
    expect(glyphPathToPlaces(commands, 1, 0, 0, 0)).toHaveLength(101);
    expect(glyphPathToPlaces(commands, 1, -5, 0, 0)).toHaveLength(101);
});

test('glyphPathToPlaces traces the closing edge back to the start', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [0, 100] },
        { command: 'closePath', args: [] },
    ];
    const points = glyphPathToPlaces(commands, 1, 1, 0, 0);
    // 1 move + 100 line + 100 closing samples; ends back at the start.
    expect(points).toHaveLength(201);
    expect(points[points.length - 1]).toEqual({ x: 0, y: 0 });
});

test('getFontFileURL builds fixed-weight, italic, and range file paths', () => {
    // Fixed single weight, no range.
    expect(
        getFontFileURL({
            name: 'Pacifico',
            weight: 400,
            italic: false,
            format: 'woff2',
            range: undefined,
        }),
    ).toBe('/fonts/Pacifico/Pacifico-400.woff2');

    // Italic adds the -italic suffix.
    expect(
        getFontFileURL({
            name: 'Pacifico',
            weight: 400,
            italic: true,
            format: 'woff2',
            range: undefined,
        }),
    ).toBe('/fonts/Pacifico/Pacifico-400-italic.woff2');

    // A range-subset face appends the range's index.
    const ranges = Faces['Noto Sans'].ranges;
    const range = Array.isArray(ranges) ? ranges[7] : undefined;
    expect(
        getFontFileURL({
            name: 'Noto Sans',
            weight: 400,
            italic: false,
            format: 'woff2',
            range,
        }),
    ).toBe('/fonts/NotoSans/NotoSans-400-7.woff2');
});

test('getFontFileURL uses -all for variable-weight faces', () => {
    expect(
        getFontFileURL({
            name: 'Quicksand',
            weight: 400,
            italic: false,
            format: 'woff2',
            range: undefined,
        }),
    ).toBe('/fonts/Quicksand/Quicksand-all.woff2');
});
