import { expect, test } from 'vitest';
import { pullAcceleration } from './Physics';
import { PX_PER_METER } from '@output/Output/outputToCSS';

/**
 * The whole of the attraction math, tested without Rapier or a browser, the way
 * planSteps and interpolateTransform are. What it produces is an acceleration in
 * px/s², so the pulled body's own mass never enters into it.
 */

/** A separation of `meters` along x, in the px the engine works in. */
function metersX(meters: number) {
    return meters * PX_PER_METER;
}

test('pull points toward a positive attractor', () => {
    const a = pullAcceleration(metersX(2), 0, 1);
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBe(0);
});

test('negative strength pushes away instead', () => {
    const toward = pullAcceleration(metersX(2), 0, 1);
    const away = pullAcceleration(metersX(2), 0, -1);
    expect(away.x).toBeCloseTo(-toward.x);
});

test('pull falls off with the square of the distance', () => {
    const near = pullAcceleration(metersX(2), 0, 1);
    const far = pullAcceleration(metersX(4), 0, 1);
    // Twice as far is a quarter as strong.
    expect(near.x / far.x).toBeCloseTo(4);
});

test('pull scales with the attractor strength', () => {
    const one = pullAcceleration(metersX(3), 0, 1);
    const ten = pullAcceleration(metersX(3), 0, 10);
    expect(ten.x / one.x).toBeCloseTo(10);
});

test('the direction is a unit vector times the magnitude', () => {
    // A 3-4-5 triangle: the components must be in the same 3:4 ratio.
    const a = pullAcceleration(metersX(3), metersX(4), 1);
    expect(a.x / a.y).toBeCloseTo(3 / 4);
    const magnitude = Math.hypot(a.x, a.y);
    // 5m away, so the magnitude matches a straight 5m pull.
    expect(magnitude).toBeCloseTo(pullAcceleration(metersX(5), 0, 1).x);
});

test('a very close body is not flung to infinity', () => {
    // Newton's 1/r² is unbounded as r → 0. The softening floor is what keeps a
    // direct hit from launching output off stage.
    const touching = pullAcceleration(metersX(0.001), 0, 1);
    const atFloor = pullAcceleration(metersX(0.5), 0, 1);
    expect(Number.isFinite(touching.x)).toBe(true);
    expect(Math.abs(touching.x)).toBeLessThanOrEqual(
        Math.abs(atFloor.x) + 1e-9,
    );
});

test('exactly coincident bodies have no direction, so no pull', () => {
    expect(pullAcceleration(0, 0, 1)).toEqual({ x: 0, y: 0 });
});

test('an attractor that does not pull produces nothing', () => {
    // Matter.pull defaults to 0, which is every project that never asks.
    expect(pullAcceleration(metersX(2), 0, 0)).toEqual({ x: 0, y: 0 });
});

test('a non-finite strength produces no pull, rather than a NaN impulse', () => {
    // Matter(pull: !#) keeps the NaN — it is only data there — so this is the
    // funnel that has to refuse it. `matter.pull !== 0` is true for NaN, so an
    // unguarded NaN would be collected as an attractor and handed to every
    // dynamic body at that depth.
    expect(pullAcceleration(metersX(2), 0, NaN)).toEqual({ x: 0, y: 0 });
    expect(pullAcceleration(metersX(2), 0, Infinity)).toEqual({ x: 0, y: 0 });
});

test('a non-finite offset produces no pull either', () => {
    expect(pullAcceleration(NaN, 0, 1)).toEqual({ x: 0, y: 0 });
    expect(pullAcceleration(Infinity, 0, 1)).toEqual({ x: 0, y: 0 });
});
