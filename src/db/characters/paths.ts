/**
 * Geometry the character editor performs on shapes — a path's points and curves,
 * and the boxes and mirrors that span every shape kind.
 *
 * Separate from Character.ts because only the character editor needs them, while
 * Character.ts is reachable from the database on every page — see the import
 * budgets in importGraph.test.ts.
 */
import {
    CharacterSize,
    type CharacterPath,
    type CharacterShape,
    type PathPoint,
    type PathPoints,
    type Point,
} from '@db/characters/Character';

/** The box a shape occupies on the grid. */
export type Bounds = {
    left: number;
    top: number;
    right: number;
    bottom: number;
};

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
    const [first, ...rest] = remaining;
    if (first === undefined) return undefined;
    // A curve belongs to the segment arriving at its point, and the first point
    // of a path has no segment arriving at it except the one that closes it. So a
    // point promoted to first would silently bend the closing segment with a
    // control point drawn for a different one, or carry a curve nothing draws.
    if (index === 0 && first.curve !== undefined) {
        const straightened = { ...first };
        delete straightened.curve;
        return [straightened, ...rest];
    }
    return [first, ...rest];
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
export function getPathBounds(path: CharacterPath): Bounds {
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

/**
 * The box any shape occupies, so measuring a selection doesn't have to re-derive
 * the per-kind arithmetic at each site. An ellipse's point is treated as its top
 * left corner rather than its center, which is how this editor has always measured
 * one.
 */
export function getShapeBounds(shape: CharacterShape): Bounds {
    switch (shape.type) {
        case 'pixel':
            return {
                left: shape.point.x,
                top: shape.point.y,
                right: shape.point.x,
                bottom: shape.point.y,
            };
        case 'rect':
        case 'ellipse':
            return {
                left: shape.point.x,
                top: shape.point.y,
                right: shape.point.x + shape.width,
                bottom: shape.point.y + shape.height,
            };
        case 'path':
            return getPathBounds(shape);
    }
}

/** The box a group of shapes occupies together. */
export function getShapesBounds(shapes: CharacterShape[]): Bounds | undefined {
    if (shapes.length === 0) return undefined;
    const boxes = shapes.map(getShapeBounds);
    return {
        left: Math.min(...boxes.map((b) => b.left)),
        top: Math.min(...boxes.map((b) => b.top)),
        right: Math.max(...boxes.map((b) => b.right)),
        bottom: Math.max(...boxes.map((b) => b.bottom)),
    };
}

/**
 * Mirror a shape in place, about the given box. The box is the caller's, not the
 * shape's: mirroring a shape about its own center is a no-op for a rectangle, an
 * ellipse and a pixel, all of which are symmetric about theirs, which is why
 * flipping used to appear to work only on paths.
 */
export function flipShape(
    shape: CharacterShape,
    box: Bounds,
    direction: 'horizontal' | 'vertical',
): void {
    const horizontal = direction === 'horizontal';
    const mirrorX = (x: number) => box.left + box.right - x;
    const mirrorY = (y: number) => box.top + box.bottom - y;

    if (shape.type === 'path')
        shape.points = transformPathPoints(shape.points, ({ x, y }) =>
            horizontal ? { x: mirrorX(x), y } : { x, y: mirrorY(y) },
        );
    // The far edge becomes the near one, so a sized shape mirrors by its whole
    // width rather than by its corner alone.
    else if (horizontal)
        shape.point.x = mirrorX(
            shape.point.x + ('width' in shape ? shape.width : 0),
        );
    else
        shape.point.y = mirrorY(
            shape.point.y + ('height' in shape ? shape.height : 0),
        );

    // A mirror reverses the direction a shape is turned.
    if ('angle' in shape && shape.angle !== undefined)
        shape.angle = -shape.angle;
}
