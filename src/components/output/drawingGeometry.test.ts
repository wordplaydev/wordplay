import {
    finishStroke,
    MinSampleDistance,
    shouldSample,
    simplifyPath,
} from '@components/output/drawing';
import type { PathPoint } from '@output/Output/Shape/Path';
import { expect, test } from 'vitest';

test('a sample is kept only once the pointer has travelled', () => {
    // The first one always: there is nothing to be far from yet.
    expect(shouldSample([], { x: 0, y: 0 })).toBe(true);
    const points: PathPoint[] = [{ x: 0, y: 0 }];
    expect(shouldSample(points, { x: MinSampleDistance / 2, y: 0 })).toBe(
        false,
    );
    expect(shouldSample(points, { x: MinSampleDistance, y: 0 })).toBe(true);
    // Distance, not displacement along one axis.
    expect(shouldSample(points, { x: 0.1, y: 0.1 })).toBe(false);
    expect(shouldSample(points, { x: 0.2, y: 0.2 })).toBe(true);
});

test('a straight run collapses to its two ends', () => {
    const line: PathPoint[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
    ];
    expect(simplifyPath(line)).toEqual([
        { x: 0, y: 0 },
        { x: 4, y: 0 },
    ]);
});

test('a corner is the point that survives', () => {
    // The whole reason for RDP rather than keeping every nth sample: the deepest point of a
    // bend is exactly the one a fixed stride is most likely to drop. A long flat run with one
    // spike in it — a stride of 4 would miss the spike entirely.
    const spike: PathPoint[] = [];
    for (let i = 0; i <= 20; i++) spike.push({ x: i * 0.5, y: 0 });
    spike.splice(10, 0, { x: 4.75, y: 3 });

    const simplified = simplifyPath(spike);
    expect(simplified).toContainEqual({ x: 4.75, y: 3 });
    expect(simplified[0]).toEqual({ x: 0, y: 0 });
    expect(simplified.at(-1)).toEqual({ x: 10, y: 0 });
    // 22 samples become 5: the two ends, the spike's tip, and the two points at its base,
    // which are part of the spike rather than part of the flat run.
    expect(spike).toHaveLength(22);
    expect(simplified).toHaveLength(5);
    expect(simplified).toContainEqual({ x: 4.5, y: 0 });
    expect(simplified).toContainEqual({ x: 5, y: 0 });
});

test('simplifying keeps the shape of a curve', () => {
    // A quarter circle sampled finely: far fewer points out, but still recognisably an arc.
    const arc: PathPoint[] = Array.from({ length: 60 }, (_, i) => {
        const angle = (i / 59) * (Math.PI / 2);
        return { x: 5 * Math.cos(angle), y: 5 * Math.sin(angle) };
    });
    const simplified = simplifyPath(arc);
    expect(simplified.length).toBeLessThan(arc.length / 3);
    expect(simplified.length).toBeGreaterThan(3);
    // Endpoints are never dropped.
    expect(simplified[0]).toEqual(arc[0]);
    expect(simplified.at(-1)).toEqual(arc.at(-1));
    // Every kept point is still on the circle.
    for (const point of simplified)
        expect(Math.hypot(point.x, point.y)).toBeCloseTo(5, 6);
});

test('fewer than three points are left alone', () => {
    expect(simplifyPath([])).toEqual([]);
    expect(simplifyPath([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
    const two: PathPoint[] = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
    ];
    expect(simplifyPath(two)).toEqual(two);
});

test('a finished stroke is rounded to two decimals', () => {
    // Matching what a drag writes, so a drawn place and a dragged one look alike in code.
    expect(
        finishStroke([
            { x: 0.123456, y: -1.987654 },
            { x: 4.444444, y: 2.555555 },
        ]),
    ).toEqual([
        { x: 0.12, y: -1.99 },
        { x: 4.44, y: 2.56 },
    ]);
});

test('a stroke that is really a dot commits nothing', () => {
    // A click that missed, or a press that never moved: committing it would leave a shape in
    // the program with nothing to see.
    expect(finishStroke([])).toBeUndefined();
    expect(finishStroke([{ x: 1, y: 1 }])).toBeUndefined();
    // Two samples that round onto each other are also a dot.
    expect(
        finishStroke([
            { x: 1, y: 1 },
            { x: 1.001, y: 1.001 },
        ]),
    ).toBeUndefined();
});

test('a finished stroke drops points rounding made identical', () => {
    const stroke = finishStroke([
        { x: 0, y: 0 },
        { x: 1, y: 0.001 },
        { x: 1.002, y: 0.002 },
        { x: 2, y: 0 },
    ]);
    expect(stroke).toBeDefined();
    const keys = (stroke ?? []).map((point) => `${point.x},${point.y}`);
    expect(new Set(keys).size).toBe(keys.length);
});
