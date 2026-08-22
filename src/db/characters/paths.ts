/**
 * Editing operations on a character path's points, including its curves.
 *
 * Separate from Character.ts because only the character editor needs them, while
 * Character.ts is reachable from the database on every page — see the import
 * budgets in importGraph.test.ts.
 */
import {
    CharacterSize,
    type CharacterPath,
    type PathPoint,
    type PathPoints,
    type Point,
} from '@db/characters/Character';

/** Keep a point on the canvas, snapped to the grid, which is always on. */
export function clampToGrid({ x, y }: Point): Point {
    return {
        x: Math.max(0, Math.min(CharacterSize, Math.round(x))),
        y: Math.max(0, Math.min(CharacterSize, Math.round(y))),
    };
}

/** The point a segment leaves on its way to the point at the given index, or undefined if there is no such segment. */
export function getPriorPoint(
    points: PathPoints,
    index: number,
    closed: boolean,
): PathPoint | undefined {
    // Only a closed path has a segment arriving at its first point, coming back
    // around from the last one.
    return index === 0
        ? closed
            ? points[points.length - 1]
            : undefined
        : points[index - 1];
}

/** Whether the segment arriving at this point exists, and so can be curved or straightened. */
export function canCurve(
    points: PathPoints,
    index: number,
    closed: boolean,
): boolean {
    return getPriorPoint(points, index, closed) !== undefined;
}

/**
 * Apply a positional transform to every point of a path, control points included.
 * Everything that reshapes a path goes through this: a transform that rebuilds its
 * points as bare {x, y} silently drops their curves, and one that moves a point
 * without its control point deforms the curve instead of moving it.
 */
export function transformPathPoints(
    points: PathPoints,
    transform: (point: Point) => Point,
): PathPoints {
    const move = (point: PathPoint): PathPoint => {
        const moved: PathPoint = { ...point, ...transform(point) };
        if (point.curve) moved.curve = transform(point.curve);
        return moved;
    };
    const [first, ...rest] = points;
    return [move(first), ...rest.map(move)];
}

/**
 * Add a point next to the one at the given index, halfway along a neighboring
 * segment, so detail can be added without redrawing. Normally that's the segment
 * that follows; the last point of an open path has none, so it halves the one before
 * instead, which means every point can always be subdivided. Returns the new points
 * and the index the new point landed at.
 */
export function insertPathPoint(
    points: PathPoints,
    index: number,
    closed: boolean,
): { points: PathPoints; index: number } {
    if (points.length < 2) return { points, index };

    // Name the segment by the point it arrives at, since that's the point
    // carrying its curve.
    const following = closed ? (index + 1) % points.length : index + 1;
    const arrivesAt =
        following < points.length && following !== index ? following : index;
    const from = arrivesAt === index ? points[index - 1] : points[index];
    const to = points[arrivesAt];
    if (from === undefined || to === undefined) return { points, index };

    // Where the new point goes: in front of the point the segment arrives at,
    // which is the end of the list when a closed path wraps back to the first.
    const insertion = arrivesAt === 0 ? points.length : arrivesAt;

    const half = (a: number, b: number) => Math.round((a + b) / 2);
    const control = to.curve;
    // Split a curve at its midpoint (de Casteljau) rather than cutting a straight
    // line across it, so subdividing a curved segment doesn't reshape it.
    const midpoint: PathPoint = control
        ? {
              x: Math.round((from.x + 2 * control.x + to.x) / 4),
              y: Math.round((from.y + 2 * control.y + to.y) / 4),
              curve: { x: half(from.x, control.x), y: half(from.y, control.y) },
          }
        : { x: half(from.x, to.x), y: half(from.y, to.y) };

    const updated: PathPoint[] = points.map((point, i) =>
        i === arrivesAt && control
            ? {
                  ...point,
                  curve: { x: half(control.x, to.x), y: half(control.y, to.y) },
              }
            : point,
    );
    const grown = [
        ...updated.slice(0, insertion),
        midpoint,
        ...updated.slice(insertion),
    ];
    return { points: [grown[0], ...grown.slice(1)], index: insertion };
}

/** Remove a point, or refuse if that would leave a path too short to draw a line with. */
export function deletePathPoint(
    points: PathPoints,
    index: number,
): PathPoints | undefined {
    if (points.length <= 2) return undefined;
    const remaining = points.filter((_, i) => i !== index);
    return [remaining[0], ...remaining.slice(1)];
}

/**
 * Bend the segment arriving at a point, putting its control point at the segment's
 * midpoint — where a quadratic curve is identical to the straight line it replaces,
 * so turning a curve on changes nothing until the handle is moved.
 */
export function curvePathPoint(
    points: PathPoints,
    index: number,
    closed: boolean,
): PathPoints | undefined {
    const from = getPriorPoint(points, index, closed);
    const to = points[index];
    if (from === undefined || to === undefined) return undefined;
    const curved = points.map((point, i) =>
        i === index
            ? {
                  ...point,
                  curve: {
                      x: Math.round((from.x + to.x) / 2),
                      y: Math.round((from.y + to.y) / 2),
                  },
              }
            : point,
    );
    return [curved[0], ...curved.slice(1)];
}

/**
 * Straighten the segment arriving at a point. The key is deleted rather than set to
 * undefined because Firestore rejects a field that's present with an undefined value
 * (see Character.schema.test.ts).
 */
export function straightenPathPoint(
    points: PathPoints,
    index: number,
): PathPoints {
    const straightened = points.map((point, i) => {
        if (i !== index || point.curve === undefined) return point;
        const flat = { ...point };
        delete flat.curve;
        return flat;
    });
    return [straightened[0], ...straightened.slice(1)];
}

/** Where a quadratic Bezier reaches its extreme on one axis, if it does so between its ends. */
function curveExtreme(from: number, control: number, to: number): number[] {
    const denominator = from - 2 * control + to;
    if (denominator === 0) return [];
    const t = (from - control) / denominator;
    if (t <= 0 || t >= 1) return [];
    return [(1 - t) * (1 - t) * from + 2 * (1 - t) * t * control + t * t * to];
}

/**
 * The box a path actually occupies. A curve can bulge past the hull of the points
 * that define it, so anything that scales or positions a path has to measure the
 * curve rather than just its ends.
 */
export function getPathBounds(path: CharacterPath): {
    left: number;
    top: number;
    right: number;
    bottom: number;
} {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [index, point] of path.points.entries()) {
        xs.push(point.x);
        ys.push(point.y);
        const from = getPriorPoint(path.points, index, path.closed);
        if (point.curve && from) {
            xs.push(...curveExtreme(from.x, point.curve.x, point.x));
            ys.push(...curveExtreme(from.y, point.curve.y, point.y));
        }
    }
    return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        right: Math.max(...xs),
        bottom: Math.max(...ys),
    };
}
