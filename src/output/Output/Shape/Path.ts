import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import { pickReadableName } from '@locale/getConceptName';
import type Locales from '@locale/Locales';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { Form } from '@output/Output/Shape/Form';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { toBoolean, toNumber } from '@output/Output/Stage';
import { getOutputInputs } from '@output/Output/Valued';
import ListValue from '@values/ListValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';

export function createPathType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Path, TYPE_SYMBOL)} Form (
        ${getBind(locales, (locale) => locale.output.Path.points)}•[📍]
        ${getBind(locales, (locale) => locale.output.Path.closed)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Path.smooth)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Path.thickness)}•#m: 0.1m
        ${getBind(locales, (locale) => locale.output.Path.z)}•#m: 0m
    )
`);
}

/** A point on a path, in stage meters, y-up. */
export type PathPoint = { x: number; y: number };

/**
 * One drawn step, arriving at `to`. A step with control points is a cubic Bezier; one
 * without is a straight line. Naming a segment by the point it arrives at is the same
 * convention the character editor's paths use, so the two path models read alike.
 */
export type PathSegment = {
    c1?: PathPoint;
    c2?: PathPoint;
    to: PathPoint;
};

/** How finely a curve is sampled for bounds, length, and the physics collider. Twelve steps
 *  puts the error well under a millimeter at any size a stage shows, and keeps the collider's
 *  vertex count proportional to the points a creator actually drew. */
export const CurveSteps = 12;

/** The smallest thickness that still draws something. */
export const MinThickness = 0.01;

function add(a: PathPoint, b: PathPoint, scale: number): PathPoint {
    return { x: a.x + b.x * scale, y: a.y + b.y * scale };
}

function difference(a: PathPoint, b: PathPoint): PathPoint {
    return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * The steps that draw a path.
 *
 * Smoothing fits a Catmull-Rom spline **through** the given points and converts each span to a
 * cubic Bezier, so smoothing never moves a point a creator placed — it only bends what happens
 * between them. That is what lets `smooth` stay a rendering choice rather than a second kind of
 * point: the list is still a plain list of places, editable point by point either way.
 */
export function pathSegments(
    points: PathPoint[],
    closed: boolean,
    smooth: boolean,
): PathSegment[] {
    const count = points.length;
    if (count < 2) return [];

    // A closed path has one more span than an open one: the wrap back to the start.
    const spans = closed ? count : count - 1;
    const at = (index: number) =>
        closed
            ? points[((index % count) + count) % count]
            : points[Math.max(0, Math.min(count - 1, index))];

    const segments: PathSegment[] = [];
    for (let i = 0; i < spans; i++) {
        const to = at(i + 1);
        if (!smooth) segments.push({ to });
        else {
            const before = at(i - 1);
            const from = at(i);
            const after = at(i + 2);
            segments.push({
                c1: add(from, difference(to, before), 1 / 6),
                c2: add(to, difference(after, from), -1 / 6),
                to,
            });
        }
    }
    return segments;
}

function cubicAt(
    from: PathPoint,
    c1: PathPoint,
    c2: PathPoint,
    to: PathPoint,
    t: number,
): PathPoint {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return {
        x: a * from.x + b * c1.x + c * c2.x + d * to.x,
        y: a * from.y + b * c1.y + c * c2.y + d * to.y,
    };
}

/**
 * The path as a plain polyline, in meters. Everything that has to agree about where a path
 * *is* — its bounding box, its length, and its collision boundary — measures this one list, so
 * a smoothed path collides with the curve that was drawn rather than the points behind it.
 */
export function flattenPath(
    points: PathPoint[],
    closed: boolean,
    smooth: boolean,
): PathPoint[] {
    if (points.length === 0) return [];
    const segments = pathSegments(points, closed, smooth);
    if (segments.length === 0) return [points[0]];

    const flat: PathPoint[] = [points[0]];
    let from = points[0];
    for (const segment of segments) {
        if (segment.c1 === undefined || segment.c2 === undefined)
            flat.push(segment.to);
        else
            for (let step = 1; step <= CurveSteps; step++)
                flat.push(
                    cubicAt(
                        from,
                        segment.c1,
                        segment.c2,
                        segment.to,
                        step / CurveSteps,
                    ),
                );
        from = segment.to;
    }
    return flat;
}

/** The box a path occupies, in meters, y-up. An empty path occupies nothing at the origin. */
export function pathBounds(
    points: PathPoint[],
    closed: boolean,
    smooth: boolean,
): { left: number; top: number; width: number; height: number } {
    const flat = flattenPath(points, closed, smooth);
    if (flat.length === 0) return { left: 0, top: 0, width: 0, height: 0 };
    const xs = flat.map((point) => point.x);
    const ys = flat.map((point) => point.y);
    const left = Math.min(...xs);
    const top = Math.max(...ys);
    return {
        left,
        top,
        width: Math.max(...xs) - left,
        height: top - Math.min(...ys),
    };
}

/** How far it is from one end of a path to the other, in meters. */
export function pathLength(
    points: PathPoint[],
    closed: boolean,
    smooth: boolean,
): number {
    const flat = flattenPath(points, closed, smooth);
    let total = 0;
    for (let i = 1; i < flat.length; i++)
        total += Math.hypot(
            flat[i].x - flat[i - 1].x,
            flat[i].y - flat[i - 1].y,
        );
    return total;
}

export class Path extends Form {
    readonly points: PathPoint[];
    readonly closed: boolean;
    readonly smooth: boolean;
    readonly thickness: number;
    readonly z: number;

    /** The bounding box, computed once: every other measurement is relative to it. */
    private readonly bounds: {
        left: number;
        top: number;
        width: number;
        height: number;
    };

    constructor(
        value: Value,
        points: PathPoint[],
        closed: boolean,
        smooth: boolean,
        thickness: number,
        z: number,
    ) {
        super(value);

        this.points = points;
        this.closed = closed;
        this.smooth = smooth;
        this.thickness = Math.max(MinThickness, Math.abs(thickness));
        this.z = z;
        this.bounds = pathBounds(points, closed, smooth);
    }

    getLeft() {
        return this.bounds.left;
    }

    getTop() {
        return this.bounds.top;
    }

    getZ() {
        return this.z;
    }

    getWidth() {
        return this.bounds.width;
    }

    getHeight() {
        return this.bounds.height;
    }

    /** A path only encloses an area when it joins back up with itself. */
    isClosed() {
        return this.closed;
    }

    getThickness() {
        return this.thickness;
    }

    /** Meters (y-up) to pixels relative to the bounding box's top left (y-down), the frame
     *  every form's `toSVGPath` and `toCSSClip` are written in. */
    private toPixels(point: PathPoint): PathPoint {
        return {
            x: (point.x - this.bounds.left) * PX_PER_METER,
            y: -(point.y - this.bounds.top) * PX_PER_METER,
        };
    }

    /** The path's points as a flat pixel polyline, which is also what the physics collider uses. */
    getPixelPoints(): PathPoint[] {
        return flattenPath(this.points, this.closed, this.smooth).map((point) =>
            this.toPixels(point),
        );
    }

    getLength() {
        return pathLength(this.points, this.closed, this.smooth);
    }

    /**
     * The points a clip is taken from, in meters, or undefined when there is no region to
     * clip to.
     *
     * An open path encloses nothing, so there is no honest clip for it; the closed reading is
     * the only useful one, and it is what a creator framing a stage with a drawn line means.
     * Below three points there isn't even that, and a degenerate polygon would clip everything
     * away rather than nothing. Both the clip and the border it is framed with read this, so
     * they agree by construction — including for a smoothed path, whose curve is flattened here
     * exactly as `polygon()` would flatten it.
     */
    private getClipPoints(): PathPoint[] | undefined {
        const points = flattenPath(this.points, this.closed, this.smooth);
        return points.length < 3 ? undefined : points;
    }

    toCSSClip() {
        const points = this.getClipPoints();
        if (points === undefined) return 'none';
        // Stage pixels, not the bounding box's — a clip-path is resolved against the clipped
        // element itself, where the frame's own SVG is translated onto the box first. Getting
        // this wrong offsets the clip from the border by exactly the box's corner.
        return `polygon(${points
            .map(
                (point) =>
                    `${point.x * PX_PER_METER}px ${-point.y * PX_PER_METER}px`,
            )
            .join(', ')})`;
    }

    toClipSVGPath(x: number, y: number) {
        const points = this.getClipPoints();
        // Nothing clipped, so nothing framed: a border with no clip behind it would promise an
        // edge the stage doesn't actually have.
        if (points === undefined) return '';
        return `M ${points
            .map((point) => {
                const at = this.toPixels(point);
                return `${at.x + x} ${at.y + y}`;
            })
            .join(' L ')} Z`;
    }

    toSVGPath(x: number, y: number) {
        if (this.points.length === 0) return '';
        const start = this.toPixels(this.points[0]);
        const segments = pathSegments(this.points, this.closed, this.smooth);
        const commands = segments.map((segment) => {
            const to = this.toPixels(segment.to);
            if (segment.c1 === undefined || segment.c2 === undefined)
                return `L ${to.x + x} ${to.y + y}`;
            const c1 = this.toPixels(segment.c1);
            const c2 = this.toPixels(segment.c2);
            return `C ${c1.x + x} ${c1.y + y} ${c2.x + x} ${c2.y + y} ${
                to.x + x
            } ${to.y + y}`;
        });
        return `M ${start.x + x} ${start.y + y}${
            commands.length > 0 ? ` ${commands.join(' ')}` : ''
        }${this.closed ? ' Z' : ''}`;
    }

    getDescription(locales: Locales): string {
        return locales.getPrimaryPlainText(
            (l) => pickReadableName(l.output.Path.names) ?? '',
        );
    }
}

export function toPath(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

    const [pointsVal, closedVal, smoothVal, thicknessVal, zVal] =
        getOutputInputs(value);

    if (!(pointsVal instanceof ListValue)) return undefined;

    // An empty list is valid and draws nothing: Contour emits [] until its font has loaded,
    // and a path that refused one would make the whole shape vanish and reappear.
    const points: PathPoint[] = [];
    for (const item of pointsVal.values) {
        if (!(item instanceof StructureValue)) return undefined;
        const [xVal, yVal] = getOutputInputs(item);
        const x = toNumber(xVal);
        const y = toNumber(yVal);
        if (x === undefined || y === undefined) return undefined;
        points.push({ x, y });
    }

    const closed = toBoolean(closedVal) ?? false;
    const smooth = toBoolean(smoothVal) ?? false;
    const thickness = toNumber(thicknessVal) ?? 0.1;
    const z = toNumber(zVal) ?? 0;

    return new Path(value, points, closed, smooth, thickness, z);
}
