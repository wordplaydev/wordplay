/**
 * A cubic Bézier easing evaluator matching the CSS `cubic-bezier()` timing function.
 * Given the two control points (x1, y1) and (x2, y2) of a curve anchored at (0,0)
 * and (1,1), returns a function mapping an input progress x (0..1) to the eased
 * output y. This lets JS-driven animations ease identically to the Web Animation
 * API's CSS easing keywords. See https://www.w3.org/TR/css-easing-1/.
 */
export function cubicBezier(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): (x: number) => number {
    // Polynomial coefficients for the curve with control points (0,0),(x1,y1),(x2,y2),(1,1).
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    // Solve for the parameter t that produces the given x, then evaluate y at t.
    const solveT = (x: number) => {
        // Newton-Raphson for fast convergence.
        let t = x;
        for (let i = 0; i < 8; i++) {
            const error = sampleX(t) - x;
            if (Math.abs(error) < 1e-6) return t;
            const derivative = sampleDerivX(t);
            if (Math.abs(derivative) < 1e-6) break;
            t -= error / derivative;
        }
        // Fall back to bisection if Newton-Raphson stalls.
        let lo = 0;
        let hi = 1;
        t = x;
        while (lo < hi) {
            const error = sampleX(t) - x;
            if (Math.abs(error) < 1e-6) return t;
            if (error > 0) hi = t;
            else lo = t;
            const next = (lo + hi) / 2;
            if (next === t) return t;
            t = next;
        }
        return t;
    };

    return (x: number) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        return sampleY(solveT(x));
    };
}

/** JS equivalents of the CSS easing keywords used by the animation framework. */
export const Easings = {
    linear: (x: number) => x,
    'ease-in': cubicBezier(0.42, 0, 1, 1),
    'ease-out': cubicBezier(0, 0, 0.58, 1),
    'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
} as const;

export type EasingName = keyof typeof Easings;
