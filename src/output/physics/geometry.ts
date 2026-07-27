export type Point = { readonly x: number; readonly y: number };
export type Velocity = { readonly vx: number; readonly vy: number };
/** Assumes consecutive points form edges and that edges form a convex polygon */
export type Polygon = Point[];
export type Segment = readonly [Point, Point];

export function point(x: number, y: number) {
    return { x, y };
}

export function segment(x1: number, y1: number, x2: number, y2: number) {
    return [point(x1, y1), point(x2, y2)] as const;
}

export function polygon(...points: [x: number, y: number][]) {
    return points.map((p) => point(...p));
}

/** Get the magnitude of the segment */
export function segmentMagnitude(segment: Segment) {
    // Find the magnitude of the vector defined by the segment.
    return magnitude(segment[0].x, segment[0].y, segment[1].x, segment[1].y);
}

export function magnitude(x1: number, y1: number, x2 = 0, y2 = 0) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/** Get the unit vector of a segment */
// Normalize
export function unit(segment: Segment): Point {
    const mag = segmentMagnitude(segment);
    return {
        x: (segment[1].x - segment[0].x) / mag,
        y: (segment[1].y - segment[0].y) / mag,
    };
}

/** Take a point, and a center, and rotate the point around the center */
export function rotateAround(
    x: number,
    y: number,
    cx: number,
    cy: number,
    radians: number
): Point {
    return {
        x: cx + (x - cx) * Math.cos(radians) - (y - cy) * Math.sin(radians),
        y: cy + (x - cx) * Math.sin(radians) + (y - cy) * Math.cos(radians),
    };
}

/**
 * Finds the point of intersection between two lines, if it exists, modeling lines as Bezier
 * parameters interpolations. See the vector algebra here: https://paulbourke.net/geometry/pointlineplane/.
 */
export function getSegmentIntersect(
    segment1: Segment,
    segment2: Segment
): Point | undefined {
    // If either line is a point, they don't intersect.
    if (isPoint(segment1) || isPoint(segment2)) return undefined;

    // Compute the denominator
    const denominator =
        (segment2[1].y - segment2[0].y) * (segment1[1].x - segment1[0].x) -
        (segment2[1].x - segment2[0].x) * (segment1[1].y - segment1[0].y);

    // Check if lines are parallel
    if (denominator === 0) return undefined;

    // Compute interpolation parameters
    const ua =
        ((segment2[1].x - segment2[0].x) * (segment1[0].y - segment2[0].y) -
            (segment2[1].y - segment2[0].y) * (segment1[0].x - segment2[0].x)) /
        denominator;
    const ub =
        ((segment1[1].x - segment1[0].x) * (segment1[0].y - segment2[0].y) -
            (segment1[1].y - segment1[0].y) * (segment1[0].x - segment2[0].x)) /
        denominator;

    // If parameters are outside a 0 to 1 range, it means the intersection is not along the segment.
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return undefined;
    }

    // Compute the intersection coordinate.
    return {
        x: segment1[0].x + ua * (segment1[1].x - segment1[0].x),
        y: segment1[0].y + ua * (segment1[1].y - segment1[0].y),
    };
}

/** True if the points are the same */
export function isPoint(line: Segment) {
    return line[0].x === line[1].x && line[0].y === line[1].y;
}

/**
 * Given two convex polygons, finds all points of intersection between their edges.
 */
export function getPolygonIntersect(
    poly1: Polygon,
    poly2: Polygon
): { segment1: Segment; segment2: Segment; point: Point }[] {
    // Keep a list of intersection points
    const intersections: {
        segment1: Segment;
        segment2: Segment;
        point: Point;
    }[] = [];

    // Iterate through all points
    for (let n = 0; n < poly1.length; n++) {
        // Construct a segment from this point to the next point in the polygon
        const segment1 = [poly1[n], poly1[(n + 1) % poly1.length]] as const;

        // Iterate through the edges of the other polygon
        for (let k = 0; k < poly2.length; k++) {
            const segment2 = [poly2[k], poly2[(k + 1) % poly2.length]] as const;

            const intersection = getSegmentIntersect(segment1, segment2);

            // If the segments intersect, and the point is not already in the list, add it.
            if (
                intersection &&
                !intersections.some(
                    (i) =>
                        i.point.x === intersection.x &&
                        i.point.y === intersection.y
                )
            )
                intersections.push({
                    segment1,
                    segment2,
                    point: intersection,
                });
        }
    }
    return intersections;
}

/**
 * Compute new velocities based on current velocities and two points forming a collision segment.
 * Use an impulse reponse: https://en.wikipedia.org/wiki/Collision_response
 */
export function getCollisionVelocities(
    velocity1: Velocity,
    mass1: number,
    elasticity1: number,
    velocity2: Velocity,
    mass2: number,
    elasticity2: number,
    collisionPoint1: Point,
    collisionPoint2: Point
): [Velocity, Velocity] {
    // Compute relative velocity
    const relativeVelocity = {
        vx: velocity1.vx - velocity2.vx,
        vy: velocity1.vy - velocity2.vy,
    };

    // Compute the segment between the two collision points
    const collisionNormal = unit(
        segment(
            -(collisionPoint2.y - collisionPoint1.y),
            collisionPoint2.x - collisionPoint1.x,
            collisionPoint2.y - collisionPoint1.y,
            -(collisionPoint2.x - collisionPoint1.x)
        )
    );

    // Compute the dot product of the collision normal and the relative velocity to get the relative velocity along the normal of the collision.
    const vRelNormal =
        relativeVelocity.vx * collisionNormal.x +
        relativeVelocity.vy * collisionNormal.y;

    // Compute the impulse of the collision using relative velocity, unit vector of normal of collision, elasticity coefficient, and masses.
    // J = -(1  + elasticity) · (vRel · normal) / (1 ÷ massA + 1 ÷ massB)
    const elasticityFactor = -(1 + Math.min(elasticity1, elasticity2));
    const J = (elasticityFactor * vRelNormal) / (1 / mass1 + 1 / mass2);

    // Compute the new velocities
    // vA' = vA + J·normal ÷ massA
    // vB' = vB + J·normal ÷ massB
    return [
        {
            vx: velocity1.vx + (J * collisionNormal.x) / mass1,
            vy: velocity1.vy + (J * collisionNormal.y) / mass1,
        },
        {
            vx: velocity2.vx - (J * collisionNormal.x) / mass2,
            vy: velocity2.vy - (J * collisionNormal.y) / mass2,
        },
    ];
}

export function getCommonPoint(segment1: Segment, segment2: Segment) {
    if (pointsAreEqual(segment1[0], segment2[0])) return segment1[0];
    else if (pointsAreEqual(segment1[0], segment2[1])) return segment1[0];
    else if (pointsAreEqual(segment1[1], segment2[0])) return segment1[1];
    else if (pointsAreEqual(segment1[1], segment2[1])) return segment1[1];
    else return undefined;
}

export function pointsAreEqual(point1: Point, point2: Point) {
    return point1.x === point2.x && point1.y === point2.y;
}

export function getDistanceFromSegmentToPoint(segment: Segment, point: Point) {
    const A = point.x - segment[0].x;
    const B = point.y - segment[0].y;
    const C = segment[1].x - segment[0].x;
    const D = segment[1].y - segment[0].y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0)
        //in case of 0 length line
        param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = segment[0].x;
        yy = segment[0].y;
    } else if (param > 1) {
        xx = segment[1].x;
        yy = segment[1].y;
    } else {
        xx = segment[0].x + param * C;
        yy = segment[0].y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}
