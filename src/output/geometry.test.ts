import { test, expect } from 'vitest';
import {
    getSegmentIntersect,
    getPolygonIntersect,
    isPoint,
    segment,
    polygon,
    type Point,
    type Polygon,
} from './geometry';

test.each([
    [segment(0, 0, 0, 0), true],
    [segment(0, 0, 0, 1), false],
    [segment(1, 0, 0, 1), false],
])('isPoint(%s) = %s', (line, is) => {
    expect(isPoint(line)).toBe(is);
});

test.each([
    /** A horizontal and vertical line on the axes should intersect at the origin */
    [segment(-2, 0, 2, 0), segment(0, -2, 0, 2), { x: 0, y: 0 }],
    /** A horizontal line and a point should have no intersection */
    [segment(-2, 0, 2, 0), segment(0, 2, 0, 2), undefined],
    /** Two diagonal lines through the origin should intersect at the origin */
    [segment(-2, -2, 2, 2), segment(-2, 2, 2, -2), { x: 0, y: 0 }],
    /** Two parallel lines should have no intersection */
    [segment(-1, -2, -1, 2), segment(1, -2, 1, 2), undefined],
])(
    'getLineIntersection(%s, %s) = %s',
    (line1, line2, point: Point | undefined) => {
        const intersection = getSegmentIntersect(line1, line2);
        if (point === undefined) expect(intersection).toBeUndefined();
        else {
            expect(intersection).toBeDefined();
            if (intersection) {
                expect(intersection.x).toBe(point.x);
                expect(intersection.x).toBe(point.y);
            }
        }
    }
);

test.each([
    /** Two non-overlapping rectangles should have no intersecting points */
    [
        polygon([-2, 2], [-1, 2], [-1, 1], [-2, 1]),
        polygon([2, -1], [2, -2], [1, -2], [1, -1]),
        [],
    ],
    /** Two overlapping rectangles should have two intersecting points */
    [
        polygon([-2, 2], [1, 2], [1, -1], [-2, -1]),
        polygon([-1, 1], [2, 1], [2, -2], [-1, -2]),
        [
            { x: 1, y: 1 },
            { x: -1, y: -1 },
        ],
    ],
    /** A square centered in the origin and a right triangle intersecting the origin should intersect in two points */
    [
        polygon([-2, 2], [2, 2], [2, -2], [-2, -2]),
        polygon([0, 0], [0, 4], [4, 4]),
        [
            { x: 0, y: 2 },
            { x: 2, y: 2 },
        ],
    ],
])(
    'getPolygonIntersection(%s, %s) = %s',
    (poly1: Polygon, poly2: Polygon, expected: Point[]) => {
        const intersection = getPolygonIntersect(poly1, poly2);
        expect(intersection.length).toBe(expected.length);
        for (const point of expected) {
            const match = intersection.find(
                (intersect) =>
                    intersect.point.x === point.x &&
                    intersect.point.y === point.y
            );
            expect(match).toBeDefined();
        }
    }
);
