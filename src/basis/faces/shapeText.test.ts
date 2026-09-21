import type { PathCommand } from 'fontkit';
import { expect, test } from 'vitest';
import { must } from '@util/nullable';
import { flattenGlyphLoops, shapeTextGlyphs } from '@basis/faces/shapeText';

test('a subpath becomes a loop, and two subpaths become two', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [10, 0] },
        { command: 'closePath', args: [] },
        { command: 'moveTo', args: [2, 2] },
        { command: 'lineTo', args: [4, 2] },
        { command: 'closePath', args: [] },
    ];
    const loops = flattenGlyphLoops(commands, 1, 1, 0, 0);
    expect(loops).toHaveLength(2);
    // Each loop traces out and back: the closing edge is sampled too, which is
    // what makes a counter a closed ring rather than an open arc.
    expect(must(loops[0], 'the outer loop').length).toBeGreaterThan(10);
    expect(must(loops[1], 'the inner loop').length).toBeGreaterThan(2);
});

test('a loop ends where it began', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [4, 0] },
        { command: 'lineTo', args: [4, 4] },
        { command: 'closePath', args: [] },
    ];
    const loop = must(flattenGlyphLoops(commands, 1, 1, 0, 0)[0], 'the loop');
    const first = must(loop[0], 'the first point');
    const last = must(loop.at(-1), 'the last point');
    expect(last.x).toBeCloseTo(first.x);
    expect(last.y).toBeCloseTo(first.y);
});

test('scale and offset apply to every loop', () => {
    const commands: PathCommand[] = [
        { command: 'moveTo', args: [0, 0] },
        { command: 'lineTo', args: [100, 0] },
        { command: 'moveTo', args: [0, 100] },
        { command: 'lineTo', args: [100, 100] },
    ];
    // Scale 0.01 (font units to em at 100 upem), offset a quarter em right.
    const loops = flattenGlyphLoops(commands, 0.01, 0.1, 0.25, 0);
    expect(loops).toHaveLength(2);
    expect(must(must(loops[0], 'first')[0], 'its start').x).toBeCloseTo(0.25);
    expect(must(must(loops[1], 'second')[0], 'its start').y).toBeCloseTo(1);
});

test('shaping without a browser yields no glyphs rather than failing', async () => {
    // getContourFont returns undefined when there is no window, so under the
    // test runner every run contributes nothing — the same degradation a
    // server render gets, and why the collider builder is tested separately
    // from font loading.
    await expect(
        shapeTextGlyphs('A', 'Noto Sans', 400, false),
    ).resolves.toEqual([]);
});

test('an unknown face yields no glyphs', async () => {
    await expect(
        shapeTextGlyphs('A', 'Not A Real Face', 400, false),
    ).resolves.toEqual([]);
});
