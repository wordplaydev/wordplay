import {
    characterToSVG,
    moveShape,
    type Character,
    type CharacterPath,
    type PathPoints,
} from '@db/characters/Character';
import {
    canCurve,
    clampToGrid,
    curvePathPoint,
    deletePathPoint,
    getPathBounds,
    insertPathPoint,
    straightenPathPoint,
    transformPathPoints,
} from '@db/characters/paths';
import { describe, expect, test } from 'vitest';

function path(points: PathPoints, closed = false): CharacterPath {
    return { type: 'path', points, closed };
}

/** A square with a curve bulging out of its right edge. */
function curvedSquare(): CharacterPath {
    return path(
        [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: 10, y: 10, curve: { x: 20, y: 5 } },
            { x: 0, y: 10 },
        ],
        true,
    );
}

describe('clampToGrid', () => {
    test('snaps to whole units and stops at the canvas edge', () => {
        expect(clampToGrid({ x: 4.4, y: 4.6 })).toEqual({ x: 4, y: 5 });
        expect(clampToGrid({ x: -3, y: 99 })).toEqual({ x: 0, y: 32 });
    });
});

describe('canCurve', () => {
    const points: PathPoints = [
        { x: 0, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 4 },
    ];

    test('an open path has no segment arriving at its first point', () => {
        expect(canCurve(points, 0, false)).toBe(false);
        expect(canCurve(points, 1, false)).toBe(true);
    });

    test('a closed path wraps around, so even its first point has one', () => {
        expect(canCurve(points, 0, true)).toBe(true);
    });
});

describe('rendering', () => {
    test('a straight segment is a line and a curved one is a quadratic', () => {
        const svg = characterToSVG(character(curvedSquare()), 32);
        expect(svg).toContain('L 10 0');
        expect(svg).toContain('Q 20 5 10 10');
    });

    test("a closed path's final segment is bent by the first point's control point", () => {
        const svg = characterToSVG(
            character(
                path(
                    [
                        { x: 0, y: 0, curve: { x: 5, y: 9 } },
                        { x: 8, y: 0 },
                        { x: 8, y: 8 },
                    ],
                    true,
                ),
            ),
            32,
        );
        // The closing segment curves back into the first point before Z.
        expect(svg).toContain('Q 5 9 0 0 Z');
    });

    test('an open path never draws a closing segment', () => {
        const svg = characterToSVG(
            character(
                path([
                    { x: 0, y: 0, curve: { x: 5, y: 9 } },
                    { x: 8, y: 0 },
                ]),
            ),
            32,
        );
        expect(svg).not.toContain('Z');
        expect(svg).not.toContain('Q 5 9 0 0');
    });
});

/**
 * Every transform that reshapes a path has to carry control points along. Each of
 * these used to drop or deform them: fit rebuilt points as bare {x, y}, and flip and
 * move touched the points but not the curves bending between them.
 */
describe('transforms preserve curves', () => {
    test('translating moves a control point with its segment', () => {
        const shape = curvedSquare();
        moveShape(shape, 2, 3, 'translate');
        expect(shape.points[2].curve).toEqual({ x: 22, y: 8 });
    });

    test('repositioning moves a control point with its segment', () => {
        const shape = curvedSquare();
        const control = shape.points[2].curve;
        expect(control).toBeDefined();
        if (control === undefined) return;
        // Snapshot the offset, since moveShape edits the control point in place.
        const offset = {
            x: control.x - shape.points[2].x,
            y: control.y - shape.points[2].y,
        };
        moveShape(shape, 20, 20, 'move');
        const after = shape.points[2].curve;
        expect(after).toBeDefined();
        // The control point kept its offset from the point it bends toward.
        if (after)
            expect({
                x: after.x - shape.points[2].x,
                y: after.y - shape.points[2].y,
            }).toEqual(offset);
    });

    test('a transform that rebuilds points keeps their curves', () => {
        const shape = curvedSquare();
        const flipped = transformPathPoints(shape.points, ({ x, y }) => ({
            x: 10 - x,
            y,
        }));
        // Mirrored with the rest of the path, so the bulge flips too.
        expect(flipped[2].curve).toEqual({ x: -10, y: 5 });
    });

    test('a transform on a path with no curves adds no curve keys', () => {
        const flat = transformPathPoints(
            [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ],
            ({ x, y }) => ({ x: x + 1, y }),
        );
        expect(flat.every((p) => !('curve' in p))).toBe(true);
    });
});

describe('getPathBounds', () => {
    test('measures the bulge, not just the points that define it', () => {
        // The points reach x = 10, but the curve swings out past them.
        expect(getPathBounds(curvedSquare()).right).toBeGreaterThan(10);
    });

    test('a straight path is bounded by its points', () => {
        expect(
            getPathBounds(
                path([
                    { x: 2, y: 3 },
                    { x: 9, y: 7 },
                ]),
            ),
        ).toEqual({ left: 2, top: 3, right: 9, bottom: 7 });
    });
});

describe('insertPathPoint', () => {
    const square: PathPoints = [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 8 },
        { x: 0, y: 8 },
    ];

    test('halves the segment that follows', () => {
        const result = insertPathPoint(square, 0, false);
        expect(result.index).toBe(1);
        expect(result.points[1]).toEqual({ x: 4, y: 0 });
    });

    test('the last point of an open path halves the segment before it instead', () => {
        const result = insertPathPoint(square, 3, false);
        // Every point can be subdivided, even the one with nothing after it.
        expect(result.points).toHaveLength(5);
        expect(result.points[result.index]).toEqual({ x: 4, y: 8 });
    });

    test('the last point of a closed path halves the segment that closes it', () => {
        const result = insertPathPoint(square, 3, true);
        expect(result.index).toBe(4);
        expect(result.points[4]).toEqual({ x: 0, y: 4 });
    });

    test('subdividing a curve keeps its shape rather than cutting across it', () => {
        const curved: PathPoints = [
            { x: 0, y: 0 },
            { x: 8, y: 0, curve: { x: 4, y: 8 } },
        ];
        const result = insertPathPoint(curved, 0, false);
        // De Casteljau at t=0.5: the new point sits on the curve, not on the
        // chord, and both halves get their own control points.
        expect(result.points[1]).toEqual({ x: 4, y: 4, curve: { x: 2, y: 4 } });
        expect(result.points[2].curve).toEqual({ x: 6, y: 4 });
    });
});

describe('deletePathPoint', () => {
    test('removes the point', () => {
        const result = deletePathPoint(
            [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ],
            1,
        );
        expect(result).toEqual([
            { x: 0, y: 0 },
            { x: 2, y: 2 },
        ]);
    });

    test('refuses rather than leaving a path too short to draw', () => {
        expect(
            deletePathPoint(
                [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                0,
            ),
        ).toBeUndefined();
    });
});

describe('curving and straightening', () => {
    const points: PathPoints = [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
    ];

    test('a new curve sits at the midpoint, so nothing moves until it is dragged', () => {
        const curved = curvePathPoint(points, 1, false);
        expect(curved?.[1].curve).toEqual({ x: 4, y: 0 });
    });

    test('a segment that does not exist cannot be curved', () => {
        expect(curvePathPoint(points, 0, false)).toBeUndefined();
    });

    /**
     * Firestore's setDoc throws on a key present with an undefined value, so
     * straightening has to remove the key, not blank it.
     */
    test('straightening removes the key rather than blanking it', () => {
        const curved = curvePathPoint(points, 1, false);
        expect(curved).toBeDefined();
        if (curved === undefined) return;
        const straight = straightenPathPoint(curved, 1);
        expect('curve' in straight[1]).toBe(false);
    });

    test('straightening an already straight segment leaves it alone', () => {
        expect(straightenPathPoint(points, 1)).toEqual(points);
    });
});

function character(shape: CharacterPath): Character {
    return {
        id: '3f7a1c9e-2b4d-4e8a-9c1f-6d5b0a2e7c31',
        owner: null,
        public: true,
        collaborators: [],
        updated: 0,
        name: 'someone/Thing',
        description: '',
        shapes: [shape],
    };
}
