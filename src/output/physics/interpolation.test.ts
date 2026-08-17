import { expect, test } from 'vitest';
import { interpolateTransform, planSteps, type BodyTransform } from './Physics';

const MaxSteps = 4;

/** One second of frames at a given refresh rate and animation factor, reporting
 *  what each frame would render. */
function frames(hz: number, factor: number, count = 60) {
    const elapsed = 1000 / hz;
    let accumulator = 0;
    const taken: number[] = [];
    const alphas: number[] = [];
    for (let frame = 0; frame < count; frame++) {
        const plan = planSteps(accumulator, elapsed, factor, MaxSteps);
        accumulator = plan.accumulator;
        taken.push(plan.steps);
        alphas.push(plan.alpha);
    }
    return { taken, alphas };
}

/** How often two frames in a row would render the same thing — the defect,
 *  measured. A frame that takes no step still advances alpha, so it still
 *  moves; only a frame that advances neither repeats. */
function repeated(hz: number, factor: number): number {
    const { taken, alphas } = frames(hz, factor);
    let same = 0;
    for (let i = 1; i < taken.length; i++)
        if (taken[i] === 0 && alphas[i] === alphas[i - 1]) same++;
    return same;
}

test('at 60Hz and full speed, nearly every frame steps', () => {
    const { taken } = frames(60, 1);
    expect(taken.filter((steps) => steps > 0).length).toBeGreaterThan(55);
});

// The reported defect. Half of these frames take no step at all, so before
// interpolation half of them rendered the previous position exactly.
test('at 120Hz, half the frames take no step — and still advance', () => {
    const { taken } = frames(120, 1);
    const still = taken.filter((steps) => steps === 0).length;
    expect(still).toBeGreaterThan(20);
    expect(repeated(120, 1)).toBe(0);
});

// animationFactor divides elapsed time before it reaches the accumulator, so
// half speed at 60Hz is the same arithmetic as full speed at 120Hz. That is
// what makes the slow-motion settings reproduce the high-refresh defect.
test('half speed at 60Hz is arithmetically the same as 120Hz', () => {
    expect(frames(60, 2).taken).toEqual(frames(120, 1).taken);
});

test('at quarter speed, three frames in four take no step — and still advance', () => {
    const { taken } = frames(60, 4);
    expect(taken.filter((steps) => steps === 0).length).toBeGreaterThan(40);
    expect(repeated(60, 4)).toBe(0);
});

test('alpha stays a fraction of one step', () => {
    for (const [hz, factor] of [
        [60, 1],
        [120, 1],
        [60, 4],
        [144, 1],
    ] as const)
        for (const alpha of frames(hz, factor).alphas) {
            expect(alpha).toBeGreaterThanOrEqual(0);
            expect(alpha).toBeLessThanOrEqual(1);
        }
});

// A hidden tab returns owing more time than the cap allows. The remainder is
// dropped rather than spiralled through, so there is no partial step to be
// part-way through: show where the engine actually got to.
test('a long pause drops its debt and renders the state reached', () => {
    const plan = planSteps(0, 5000, 1, MaxSteps);
    expect(plan.steps).toBe(MaxSteps);
    expect(plan.accumulator).toBe(0);
    expect(plan.alpha).toBe(1);
});

// Evaluator.end() ticks physics with no elapsed time to surface pending
// collisions, and that can re-enter mid-step; it must change nothing.
test('a zero-elapsed tick is idempotent', () => {
    const first = planSteps(7, 0, 1, MaxSteps);
    const second = planSteps(first.accumulator, 0, 1, MaxSteps);
    expect(first).toEqual({ steps: 0, accumulator: 7, alpha: 7 / 16 });
    expect(second).toEqual(first);
});

const at = (x: number, y: number, angle = 0): BodyTransform => ({
    x,
    y,
    angle,
});

test('the ends of the interpolation are the states themselves', () => {
    const previous = at(0, 0);
    const current = at(10, 20);
    expect(interpolateTransform(previous, current, 0)).toEqual(previous);
    expect(interpolateTransform(previous, current, 1)).toEqual(current);
    expect(interpolateTransform(previous, current, 0.5)).toEqual(at(5, 10));
});

test('with nothing to come from, a body is where it is', () => {
    const current = at(3, 4, 1);
    expect(interpolateTransform(undefined, current, 0.5)).toEqual(current);
});

// Rapier reports a normalized angle, so a body turning past π reports a large
// negative one. Interpolating those raw would spin it most of the way back.
test('rotation takes the short way around the seam', () => {
    const previous = at(0, 0, (170 * Math.PI) / 180);
    const current = at(0, 0, (-170 * Math.PI) / 180);
    const middle = interpolateTransform(previous, current, 0.5);
    expect(Math.abs((middle.angle * 180) / Math.PI)).toBeCloseTo(180, 6);
});

test('a sweep across the seam keeps turning the same way', () => {
    // Six degrees per step, crossing from +177 to -177.
    const step = (6 * Math.PI) / 180;
    let angle = (177 * Math.PI) / 180;
    const normalize = (a: number) =>
        ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
        Math.PI;
    let last = angle;
    for (let i = 0; i < 4; i++) {
        const next = normalize(angle + step);
        for (const alpha of [0.25, 0.5, 0.75, 1]) {
            const between = interpolateTransform(
                at(0, 0, angle),
                at(0, 0, next),
                alpha,
            ).angle;
            // Each sample is a small positive turn from the one before it.
            const turn = normalize(between - last);
            expect(turn).toBeGreaterThanOrEqual(0);
            expect(turn).toBeLessThan(step);
            last = between;
        }
        angle = next;
    }
});
