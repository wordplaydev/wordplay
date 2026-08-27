import type { PathPoint } from '@output/Output/Shape/Path';

/**
 * The geometry of drawing a stroke on stage, kept pure so it can be tested without a browser.
 *
 * The point of all of it is that a stroke costs **one** project revision. The painting feature
 * this replaces re-serialized the whole accumulated stroke to source, re-parsed it, and
 * committed a revision on every sample — O(n²) parsing and one evaluator rebuild per point. Here
 * the samples live in component state until the pointer is released, and only the simplified
 * result reaches the program.
 */

/** How far the pointer must travel before another sample is kept, in meters. Below this a
 *  stroke is mostly the pointer's own jitter, and every extra point is a place the creator
 *  would later have to edit around. */
export const MinSampleDistance = 0.15;

/** How far a point may sit from the line between its neighbors and still be dropped, in
 *  meters. A tenth of a metre is under two pixels on a default stage, so simplifying at this
 *  tolerance is not visible — it only removes points that were saying nothing. */
export const SimplifyTolerance = 0.1;

/** Coordinates are written to two decimals everywhere a place is, so a drawn one matches what
 *  a drag would produce. */
export function round(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Whether a new sample is far enough from the last kept one to be worth keeping. */
export function shouldSample(
    points: PathPoint[],
    next: PathPoint,
    distance = MinSampleDistance,
): boolean {
    const last = points.at(-1);
    return (
        last === undefined ||
        Math.hypot(next.x - last.x, next.y - last.y) >= distance
    );
}

/** How far a point is from the line through `from` and `to`. */
function distanceToSegment(
    point: PathPoint,
    from: PathPoint,
    to: PathPoint,
): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    // A degenerate segment is a point, so measure to it rather than dividing by zero.
    if (length === 0) return Math.hypot(point.x - from.x, point.y - from.y);
    return Math.abs(dy * (point.x - from.x) - dx * (point.y - from.y)) / length;
}

/**
 * Drop the points that aren't saying anything (Ramer–Douglas–Peucker).
 *
 * A drag samples far more points than the shape needs, and every one of them is a point a
 * creator has to look at in their code and tab past in the point editor. Recursive rather than
 * a sliding window because the deepest point of a curve has to survive: keeping every nth
 * sample flattens exactly the corners that carry the shape.
 */
export function simplifyPath(
    points: PathPoint[],
    tolerance = SimplifyTolerance,
): PathPoint[] {
    if (points.length <= 2) return [...points];

    let furthest = 0;
    let distance = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const measured = distanceToSegment(
            points[i],
            points[0],
            points[points.length - 1],
        );
        if (measured > distance) {
            distance = measured;
            furthest = i;
        }
    }

    if (distance <= tolerance) return [points[0], points[points.length - 1]];

    // Keep the furthest point and simplify each side of it, so a corner is never the point
    // that gets dropped.
    const before = simplifyPath(points.slice(0, furthest + 1), tolerance);
    const after = simplifyPath(points.slice(furthest), tolerance);
    return [...before.slice(0, -1), ...after];
}

/**
 * The points a finished stroke commits, or undefined when there is no stroke to commit.
 *
 * Two points is the least that draws a line; one is a dot, which is what a click that missed
 * looks like, and committing one would leave an invisible shape in the program.
 */
export function finishStroke(
    points: PathPoint[],
    tolerance = SimplifyTolerance,
): PathPoint[] | undefined {
    const simplified = simplifyPath(points, tolerance).map((point) => ({
        x: round(point.x),
        y: round(point.y),
    }));
    // Rounding can collapse two neighbours onto each other, which would draw a zero-length
    // segment the creator can't see but can select.
    const distinct = simplified.filter(
        (point, index) =>
            index === 0 ||
            point.x !== simplified[index - 1].x ||
            point.y !== simplified[index - 1].y,
    );
    return distinct.length < 2 ? undefined : distinct;
}
