import { describe, expect, test } from 'vitest';
import { placeNearTarget, roomAround, type Rect } from './placeNearTarget';

const container = { width: 400, height: 800 };

/** Whether two boxes share any area — the invariant a panel must never break
 *  with the target that opened it. */
function overlaps(a: Rect, b: Rect): boolean {
    return (
        a.left < b.left + b.width &&
        a.left + a.width > b.left &&
        a.top < b.top + b.height &&
        a.top + a.height > b.top
    );
}

describe('placeNearTarget', () => {
    test('places above the target when there is room', () => {
        const target = { left: 180, top: 500, width: 40, height: 40 };
        const panel = { width: 200, height: 150 };
        const { top, placement } = placeNearTarget(target, panel, container);
        expect(placement).toBe('above');
        expect(top).toBe(350);
    });

    test('places below when it does not fit above', () => {
        const target = { left: 180, top: 60, width: 40, height: 40 };
        const panel = { width: 200, height: 150 };
        const { top, placement } = placeNearTarget(target, panel, container);
        expect(placement).toBe('below');
        expect(top).toBe(100);
    });

    test('never covers its target when it fits on neither side', () => {
        // The regression: a panel taller than the container used to be clamped
        // to the container's bottom, which pulled it back across the target.
        const target = { left: 180, top: 300, width: 40, height: 40 };
        const panel = { width: 200, height: 900 };
        const placed = placeNearTarget(target, panel, container);
        expect(
            overlaps({ ...placed, ...panel }, target),
            'panel must not overlap its target',
        ).toBe(false);
    });

    test('takes the roomier side when it fits on neither', () => {
        const panel = { width: 200, height: 900 };
        // More room below.
        expect(
            placeNearTarget(
                { left: 180, top: 100, width: 40, height: 40 },
                panel,
                container,
            ).placement,
        ).toBe('below');
        // More room above.
        expect(
            placeNearTarget(
                { left: 180, top: 700, width: 40, height: 40 },
                panel,
                container,
            ).placement,
        ).toBe('above');
    });

    test('centers horizontally, nudged inside both edges', () => {
        const panel = { width: 200, height: 100 };
        expect(
            placeNearTarget(
                { left: 180, top: 500, width: 40, height: 40 },
                panel,
                container,
            ).left,
        ).toBe(100);
        // Off the start edge: falls to the target's inline end.
        expect(
            placeNearTarget(
                { left: 0, top: 500, width: 40, height: 40 },
                panel,
                container,
            ).left,
        ).toBe(40);
        // Off the end edge: pulled inside, less the margin.
        expect(
            placeNearTarget(
                { left: 380, top: 500, width: 40, height: 40 },
                panel,
                container,
            ).left,
        ).toBe(195);
    });
});

describe('roomAround', () => {
    test('reports the space on each side, less the margin', () => {
        expect(
            roomAround({ left: 0, top: 300, width: 40, height: 40 }, container),
        ).toEqual({ above: 295, below: 455 });
    });

    test('clamps to zero for a target flush against an edge', () => {
        expect(
            roomAround({ left: 0, top: 0, width: 40, height: 40 }, container)
                .above,
        ).toBe(0);
    });
});
