import { describe, expect, test } from 'vitest';
import { getOutlineOfRows, rectsToRows, type Rect } from './outline';

/** A row, filled out the way the measuring code produces them. */
function row(l: number, t: number, r: number, b: number): Rect {
    return { l, t, r, b, w: r - l, h: b - t };
}

/** The path's vertices, in order. */
function points(path: string): [number, number][] {
    return path
        .replace(/^M\s*/, '')
        .replace(/\s*Z$/, '')
        .split(/\s*L\s*/)
        .map((pair) => {
            const [x, y] = pair.trim().split(/\s+/).map(Number);
            return [x, y] as [number, number];
        });
}

/** Segments of zero length — invisible as geometry, but a round-joined stroke
 *  wider than the padding paints each one as a bump. */
function zeroLengthSegments(path: string): number {
    const p = points(path);
    return p.filter(
        (point, i) =>
            i > 0 && point[0] === p[i - 1][0] && point[1] === p[i - 1][1],
    ).length;
}

/** Places where the trace doubles back on itself: down the right chain y must
 *  never decrease, and up the left chain it must never increase. Every hook in
 *  the rendered outline was one of these. */
function reversals(path: string): number {
    const p = points(path);
    let bottom = 0;
    p.forEach((point, i) => {
        if (point[1] > p[bottom][1]) bottom = i;
    });
    let count = 0;
    for (let i = 1; i <= bottom; i++) if (p[i][1] < p[i - 1][1]) count++;
    for (let i = bottom + 1; i < p.length; i++)
        if (p[i][1] > p[i - 1][1]) count++;
    return count;
}

describe('rectsToRows', () => {
    test('groups a line of boxes into one row', () => {
        expect(
            rectsToRows(
                [row(10, 10, 40, 24), row(45, 10, 90, 24)],
                true,
                false,
            ),
        ).toEqual([{ l: 10, t: 10, r: 90, b: 24, w: 80, h: 14 }]);
    });

    test('segments rows even when the boxes arrive out of order', () => {
        // A range's rects come from two passes — token boxes and the space boxes
        // between them — and arrive interleaved. Walked in the order given, the
        // segmentation produced rows spanning several lines at once, which drew a
        // band far past the end of a short line and left later lines with none.
        const shuffled = [
            row(10, 10, 40, 24), // line 1 token
            row(10, 60, 40, 74), // line 3 token
            row(10, 35, 90, 49), // line 2 token
            row(45, 10, 90, 24), // line 1 token
            row(45, 60, 60, 74), // line 3 token
        ];
        expect(rectsToRows(shuffled, true, false)).toEqual([
            { l: 10, t: 10, r: 90, b: 24, w: 80, h: 14 },
            { l: 10, t: 35, r: 90, b: 49, w: 80, h: 14 },
            { l: 10, t: 60, r: 60, b: 74, w: 50, h: 14 },
        ]);
    });

    test('a short line stays short', () => {
        // The overhang: a row must not inherit the width of the line above it.
        const rows = rectsToRows(
            [row(10, 35, 300, 49), row(10, 10, 40, 24)],
            true,
            false,
        );
        expect(rows.map((r) => r.r)).toEqual([40, 300]);
    });
});

describe('getOutlineOfRows', () => {
    test('a single row is a padded rectangle', () => {
        const outline = getOutlineOfRows([row(10, 10, 100, 24)]);
        expect(points(outline.path)).toEqual([
            [103, 7],
            [103, 27],
            [7, 27],
            [7, 7],
        ]);
        expect(outline).toMatchObject({
            minx: 7,
            miny: 7,
            maxx: 103,
            maxy: 27,
        });
    });

    test('rows of equal extent emit no zero-length segments', () => {
        // The list rows in a selected block are all identically indented, which
        // used to emit one dead segment per row per side.
        const path = getOutlineOfRows([
            row(10, 10, 100, 24),
            row(10, 30, 100, 44),
            row(10, 50, 100, 64),
        ]).path;
        expect(zeroLengthSegments(path)).toBe(0);
        expect(reversals(path)).toBe(0);
    });

    test('both sides turn at the same boundary', () => {
        // Row 0 ends at 24, row 1 starts at 30, so the step belongs at 27 on the
        // right edge and the left edge alike. They used to differ by the leading.
        const p = points(
            getOutlineOfRows([row(10, 10, 100, 24), row(10, 30, 200, 44)]).path,
        );
        const rightStep = p.find((point) => point[0] === 103)?.[1];
        const leftTurns = p.filter((point) => point[0] === 7).map((q) => q[1]);
        expect(p.some(([x, y]) => x === 103 && y === 27)).toBe(true);
        expect(p.some(([x, y]) => x === 203 && y === 27)).toBe(true);
        expect(rightStep).toBe(7);
        expect(leftTurns).toContain(7);
    });

    test('steps in and steps out without doubling back', () => {
        for (const rows of [
            // Narrowing.
            [row(10, 10, 200, 24), row(10, 30, 100, 44)],
            // Widening.
            [row(10, 10, 100, 24), row(10, 30, 200, 44)],
            // Indenting, like a tab-indented list under a wide line.
            [row(0, 0, 120, 14), row(40, 20, 300, 34), row(40, 40, 90, 54)],
        ]) {
            const path = getOutlineOfRows(rows).path;
            expect(reversals(path)).toBe(0);
            expect(zeroLengthSegments(path)).toBe(0);
        }
    });

    test('rows that overlap vertically still trace forward', () => {
        // A row holding space text is measured to the full line box while a
        // token-only row is tightened to its glyphs, so neighbours can overlap.
        // An overlap smaller than twice the padding used to invert the trace.
        const path = getOutlineOfRows([
            row(10, 10, 100, 30),
            row(10, 28, 200, 44),
            row(10, 42, 60, 60),
        ]).path;
        expect(reversals(path)).toBe(0);
    });

    test('a selected blank line reads as a small block', () => {
        // A blank line has no width of its own, so it gets a marker — otherwise a
        // selection that starts, ends, or consists of blank lines is invisible.
        // It must trace as a clean narrow band, not the stub the old tracing made.
        const path = getOutlineOfRows([
            row(10, 10, 300, 24),
            row(10, 30, 18, 44),
            row(10, 50, 250, 64),
        ]).path;
        expect(reversals(path)).toBe(0);
        expect(zeroLengthSegments(path)).toBe(0);
        // The marker's band is its width plus padding on each side.
        const p = points(path);
        expect(p.some(([x]) => x === 21)).toBe(true);
    });

    test('rows out of document order are traced in visual order', () => {
        const ordered = getOutlineOfRows([
            row(10, 10, 100, 24),
            row(10, 30, 200, 44),
        ]).path;
        const shuffled = getOutlineOfRows([
            row(10, 30, 200, 44),
            row(10, 10, 100, 24),
        ]).path;
        expect(shuffled).toBe(ordered);
        expect(reversals(shuffled)).toBe(0);
    });

    test('edges within a pixel or two of the row above are drawn straight', () => {
        // Lines measure slightly differently depending on their first and last
        // glyphs; unsnapped, a stroke wider than the difference wobbles.
        const p = points(
            getOutlineOfRows([
                row(31, 10, 200, 24),
                row(32, 30, 202, 44),
                row(30, 50, 199, 64),
            ]).path,
        );
        expect([...new Set(p.map(([x]) => x))].sort((a, b) => a - b)).toEqual([
            28, 203,
        ]);
    });

    test('a real step is still a step', () => {
        // One indent is far wider than the snap, so it must survive.
        const p = points(
            getOutlineOfRows([row(31, 10, 200, 24), row(51, 30, 200, 44)]).path,
        );
        expect([...new Set(p.map(([x]) => x))].sort((a, b) => a - b)).toEqual([
            28, 48, 203,
        ]);
    });

    test('an empty row list yields an empty outline', () => {
        expect(getOutlineOfRows([])).toEqual({
            path: '',
            minx: 0,
            miny: 0,
            maxx: 0,
            maxy: 0,
        });
    });
});
