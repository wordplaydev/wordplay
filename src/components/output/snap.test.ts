import { expect, test } from 'vitest';
import {
    anchorsOf,
    nextAlignment,
    sameGuides,
    snapPlace,
    type Box,
} from './snap';

/** A 1m x 1m box at the origin unless told otherwise. */
function box(fields: Partial<Box> & { label: string }): Box {
    return { x: 0, y: 0, width: 1, height: 1, ...fields };
}

const Free = { freeX: true, freeY: true };

test('anchors are the box corners, centre, and baseline', () => {
    const b = box({ label: 'a', x: 1, y: 2, width: 4, height: 6, baseline: 3 });
    expect(anchorsOf(b, 'x')).toEqual([
        ['centerX', 3],
        ['left', 1],
        ['right', 5],
    ]);
    expect(anchorsOf(b, 'y')).toEqual([
        ['centerY', 5],
        ['bottom', 2],
        ['top', 8],
        ['baseline', 3],
    ]);
});

test('a box with no text contributes no baseline', () => {
    expect(anchorsOf(box({ label: 'a' }), 'y').map(([a]) => a)).not.toContain(
        'baseline',
    );
});

test('nothing to snap to leaves the place alone', () => {
    const moved = box({ label: 'a', x: 0.37, y: -1.23 });
    const result = snapPlace(moved, [], {
        tolerance: 0.2,
        grid: false,
        ...Free,
    });
    expect(result).toEqual({ x: 0.37, y: -1.23, guides: [] });
});

test('the grid snaps to the half-metre lattice only when it is on', () => {
    const moved = box({ label: 'a', x: 0.44, y: 0 });
    expect(
        snapPlace(moved, [], { tolerance: 0.2, grid: false, ...Free }).x,
    ).toBe(0.44);
    // left = 0.44 is 0.06 from the 0.5 line, nearer than centre or right.
    expect(
        snapPlace(moved, [], { tolerance: 0.2, grid: true, ...Free }).x,
    ).toBe(0.5);
});

test('a snap out of tolerance does not engage', () => {
    const moved = box({ label: 'a', x: 0.3 });
    expect(
        snapPlace(moved, [], { tolerance: 0.01, grid: true, ...Free }).x,
    ).toBe(0.3);
});

test('an edge aligns with another output, and names it', () => {
    // Different widths, so left-to-left is the only pairing in tolerance —
    // with equal widths every anchor pairing lands the box in the same place.
    const target = box({ label: 'dog', x: 3, y: 0, width: 2 });
    const moved = box({ label: 'cat', x: 2.95, y: 5 });
    const result = snapPlace(moved, [target], {
        tolerance: 0.2,
        grid: false,
        ...Free,
    });
    expect(result.x).toBe(3);
    const guide = result.guides.find((g) => g.axis === 'x');
    expect(guide?.anchor).toBe('left');
    expect(guide?.targetAnchor).toBe('left');
    expect(guide?.target).toBe('dog');
    expect(guide?.position).toBe(3);
});

test('baselines align across faces of different sizes', () => {
    // A big phrase and a small one whose baselines are 0.05m apart: the move
    // should put them on the same line, even though neither box edge lines up.
    const target = box({
        label: 'big',
        x: 0,
        y: 0,
        height: 2,
        baseline: 0.4,
    });
    const moved = box({
        label: 'small',
        x: 4,
        y: 0.35,
        height: 1.1,
        baseline: 0.45,
    });
    const result = snapPlace(moved, [target], {
        tolerance: 0.2,
        grid: false,
        ...Free,
    });
    expect(result.y).toBe(0.3);
    const guide = result.guides.find((g) => g.axis === 'y');
    expect(guide?.anchor).toBe('baseline');
    expect(guide?.targetAnchor).toBe('baseline');
    expect(guide?.position).toBeCloseTo(0.4, 6);
});

test('a baseline never aligns with a plain edge', () => {
    // The moved box's bottom edge is 0.01m from the target's baseline, far
    // nearer than anything else — and it must still not engage.
    const target = box({ label: 'big', x: 0, y: 0, height: 2, baseline: 0.4 });
    const moved = box({ label: 'small', x: 4, y: 0.41, height: 5 });
    const result = snapPlace(moved, [target], {
        tolerance: 0.05,
        grid: false,
        ...Free,
    });
    expect(result.y).toBe(0.41);
    expect(result.guides).toEqual([]);
});

test('aligning to other output beats the grid at the same distance', () => {
    // From x = 0.24 every grid anchor lands the origin at 0, and the target's
    // left edge at 0.48 lands it at 0.48 — both 0.24 away.
    const moved = box({ label: 'a', x: 0.24 });
    const target = box({ label: 'b', x: 0.48, y: 10 });
    expect(
        snapPlace(moved, [target], { tolerance: 0.3, grid: true, ...Free }).x,
    ).toBe(0.48);
});

test('a nearer grid line still beats a further output', () => {
    const moved = box({ label: 'a', x: 0.48 });
    const target = box({ label: 'b', x: 0.3, y: 10 });
    expect(
        snapPlace(moved, [target], { tolerance: 0.3, grid: true, ...Free }).x,
    ).toBe(0.5);
});

test('an axis the arrangement computes is never snapped', () => {
    const moved = box({ label: 'a', x: 0.44, y: 0.44 });
    const result = snapPlace(moved, [], {
        tolerance: 0.2,
        grid: true,
        freeX: false,
        freeY: true,
    });
    expect(result.x).toBe(0.44);
    expect(result.y).toBe(0.5);
    expect(result.guides.every((g) => g.axis === 'y')).toBe(true);
});

test('a guide spans both boxes so it reaches between them', () => {
    const target = box({ label: 'dog', x: 3, y: -2, height: 1 });
    const moved = box({ label: 'cat', x: 2.95, y: 5, height: 1 });
    const guide = snapPlace(moved, [target], {
        tolerance: 0.2,
        grid: false,
        ...Free,
    }).guides.find((g) => g.axis === 'x');
    expect(guide?.span).toEqual({ from: -2, to: 6 });
});

test('a grid guide spans only the moved output', () => {
    const moved = box({ label: 'cat', x: 0.44, y: 2, height: 3 });
    const guide = snapPlace(moved, [], {
        tolerance: 0.2,
        grid: true,
        ...Free,
    }).guides.find((g) => g.axis === 'x');
    expect(guide?.target).toBeUndefined();
    expect(guide?.span).toEqual({ from: 2, to: 5 });
});

test('the next alignment is the nearest one beyond, in that direction', () => {
    const moved = box({ label: 'a', x: 0 });
    const near = box({ label: 'near', x: 2, y: 10 });
    const far = box({ label: 'far', x: 8, y: 10 });
    const result = nextAlignment(moved, [near, far], {
        axis: 'x',
        direction: 1,
        grid: false,
    });
    expect(result?.position).toBe(1);
    expect(result?.guide.target).toBe('near');
    // right edge of the moved box onto the left edge of `near`.
    expect(result?.guide.anchor).toBe('right');
});

test('the next alignment can be a grid line', () => {
    const moved = box({ label: 'a', x: 0.1 });
    const result = nextAlignment(moved, [], {
        axis: 'x',
        direction: 1,
        grid: true,
    });
    expect(result?.position).toBe(0.5);
    expect(result?.guide.target).toBeUndefined();
});

test('there is no next alignment past the last one', () => {
    const moved = box({ label: 'a', x: 5 });
    expect(
        nextAlignment(moved, [box({ label: 'b', x: 0, y: 10 })], {
            axis: 'x',
            direction: 1,
            grid: false,
        }),
    ).toBeUndefined();
});

test('guide sets compare by what they constrain, not by identity', () => {
    const target = box({ label: 'dog', x: 3, y: 0 });
    const first = snapPlace(box({ label: 'cat', x: 2.95, y: 5 }), [target], {
        tolerance: 0.2,
        grid: false,
        ...Free,
    }).guides;
    const again = snapPlace(box({ label: 'cat', x: 3.02, y: 5 }), [target], {
        tolerance: 0.2,
        grid: false,
        ...Free,
    }).guides;
    expect(sameGuides(first, again)).toBe(true);
    expect(sameGuides(first, [])).toBe(false);
});
