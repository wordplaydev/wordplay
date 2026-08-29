import evaluateCode from '@runtime/evaluate';
import {
    flattenPath,
    Path,
    pathBounds,
    pathLength,
    pathSegments,
    toPath,
    type PathPoint,
} from '@output/Output/Shape/Path';
import { toCircle } from '@output/Output/Shape/Circle';
import { toRectangle } from '@output/Output/Shape/Rectangle';
import { toPolygon } from '@output/Output/Shape/Polygon';
import StructureValue from '@values/StructureValue';
import { expect, test } from 'vitest';

const Zigzag =
    '[Place(-2m 0m) Place(-1m 1m) Place(0m 0m) Place(1m 1m) Place(2m 0m)]';

function path(code: string): Path {
    const value = evaluateCode(code);
    const form = toPath(value);
    if (form === undefined) throw new Error(`not a path: ${code}`);
    return form;
}

const square: PathPoint[] = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 0, y: 2 },
];

test('a path measures the box its points occupy', () => {
    const form = path(`Path(${Zigzag})`);
    expect(form.getLeft()).toBe(-2);
    expect(form.getTop()).toBe(1);
    expect(form.getWidth()).toBe(4);
    expect(form.getHeight()).toBe(1);
});

test('an open path is stroked, not filled, and carries its own thickness', () => {
    const open = path(`Path(${Zigzag})`);
    expect(open.isClosed()).toBe(false);
    expect(open.getThickness()).toBe(0.1);
    expect(path(`Path(${Zigzag} thickness: 0.4m)`).getThickness()).toBe(0.4);
    expect(path(`Path(${Zigzag} closed: ⊤)`).isClosed()).toBe(true);
});

test('the other three forms are unchanged by isClosed and getThickness', () => {
    // Both are non-abstract with defaults precisely so a rectangle, circle and polygon keep
    // filling and keep the theme's border width without knowing these exist.
    for (const form of [
        toRectangle(evaluateCode('Rectangle(-1m 1m 1m -1m)') as StructureValue),
        toCircle(evaluateCode('Circle(2m)')),
        toPolygon(evaluateCode('Polygon(2m 6)')),
    ]) {
        expect(form?.isClosed()).toBe(true);
        expect(form?.getThickness()).toBeUndefined();
    }
});

test('an empty path is valid and draws nothing', () => {
    // Contour emits an empty list until its font loads; a path that refused one would make
    // the whole shape vanish and reappear.
    const empty = path('Path([])');
    expect(empty.getWidth()).toBe(0);
    expect(empty.getHeight()).toBe(0);
    expect(empty.toSVGPath(0, 0)).toBe('');
    expect(empty.getPixelPoints()).toEqual([]);
});

test('a one-point path draws nothing but still measures its point', () => {
    const dot = path('Path([Place(3m 4m)])');
    expect(dot.getLeft()).toBe(3);
    expect(dot.getTop()).toBe(4);
    expect(dot.getWidth()).toBe(0);
    expect(pathSegments([{ x: 3, y: 4 }], false, false)).toEqual([]);
});

test('a path of anything but places is not a path', () => {
    expect(toPath(evaluateCode('Path([1 2 3])'))).toBeUndefined();
});

test('a straight path draws lines, in pixels from its top left corner', () => {
    // 4m wide and 1m tall at 64px per metre, y flipped so the SVG frame runs downward.
    expect(path(`Path(${Zigzag})`).toSVGPath(0, 0)).toBe(
        'M 0 64 L 64 0 L 128 64 L 192 0 L 256 64',
    );
});

test('a closed path returns to its start', () => {
    const closed = path(
        'Path([Place(0m 0m) Place(2m 0m) Place(2m 2m)] closed: ⊤)',
    );
    const d = closed.toSVGPath(0, 0);
    expect(d.endsWith(' Z')).toBe(true);
    // Three points, so three drawn spans when closed and two when open.
    expect(pathSegments(square, true, false)).toHaveLength(4);
    expect(pathSegments(square, false, false)).toHaveLength(3);
});

test('smoothing curves the spans without moving the points', () => {
    const smooth = path(`Path(${Zigzag} smooth: ⊤)`);
    expect(smooth.toSVGPath(0, 0).includes('C')).toBe(true);
    expect(smooth.points).toEqual(path(`Path(${Zigzag})`).points);
    // A curve can bulge past the hull of the points defining it, so the box has to measure
    // the curve rather than just its ends.
    const straightBounds = pathBounds(square, true, false);
    const smoothBounds = pathBounds(square, true, true);
    expect(smoothBounds.width).toBeGreaterThan(straightBounds.width);
    expect(smoothBounds.height).toBeGreaterThan(straightBounds.height);
});

test('flattening samples a curve and leaves a straight run alone', () => {
    // One vertex per point when straight; a curve is sampled, which is what keeps the
    // collision boundary on the curve that is actually drawn.
    expect(flattenPath(square, false, false)).toHaveLength(4);
    expect(flattenPath(square, false, true).length).toBeGreaterThan(4);
    expect(flattenPath([], false, false)).toEqual([]);
});

test('length measures the drawn line', () => {
    // Four diagonals of a 1m x 1m square.
    expect(
        pathLength(
            [
                { x: -2, y: 0 },
                { x: -1, y: 1 },
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 0 },
            ],
            false,
            false,
        ),
    ).toBeCloseTo(4 * Math.SQRT2, 6);
    // Closing a square adds its fourth side.
    expect(pathLength(square, false, false)).toBeCloseTo(6, 6);
    expect(pathLength(square, true, false)).toBeCloseTo(8, 6);
});

test('a thickness is clamped to something that still draws', () => {
    expect(
        path(`Path(${Zigzag} thickness: 0m)`).getThickness(),
    ).toBeGreaterThan(0);
    expect(path(`Path(${Zigzag} thickness: -0.3m)`).getThickness()).toBe(0.3);
});

test('a path that encloses nothing does not clip', () => {
    // Stage.frame takes any Form, so a path can be asked for a clip. A degenerate polygon
    // would clip the whole stage away, which is the opposite of what no boundary means.
    expect(path('Path([])').toCSSClip()).toBe('none');
    expect(path('Path([Place(0m 0m) Place(1m 1m)])').toCSSClip()).toBe('none');
    expect(
        path(
            'Path([Place(0m 0m) Place(2m 0m) Place(1m 2m)] closed: ⊤)',
        ).toCSSClip(),
    ).toContain('polygon(');
});

test('an open path is framed by its closed reading', () => {
    // An open path is clipped to its closed reading while being *drawn* as an open line, which
    // is the whole reason toClipSVGPath exists rather than the frame reusing toSVGPath. That
    // the clip and the border then describe the same region is checked for every form in
    // Form.test.ts; what is path-specific is here.
    const open = path('Path([Place(0m 0m) Place(2m 0m) Place(1m 2m)])');
    expect(open.toSVGPath(0, 0).endsWith('Z')).toBe(false);
    expect(open.toClipSVGPath(0, 0).endsWith('Z')).toBe(true);

    // A smoothed path is framed by the flattened curve the clip uses, not by the control
    // points behind it — so a curved frame's border follows its curve.
    const smooth = path(
        'Path([Place(0m 0m) Place(2m 0m) Place(1m 2m)] smooth: ⊤ closed: ⊤)',
    );
    const straight = path(
        'Path([Place(0m 0m) Place(2m 0m) Place(1m 2m)] closed: ⊤)',
    );
    const corners = (form: { toClipSVGPath(x: number, y: number): string }) =>
        (form.toClipSVGPath(0, 0).match(/L/g) ?? []).length;
    expect(corners(smooth)).toBeGreaterThan(corners(straight));

    // Nothing clipped, so nothing framed.
    expect(path('Path([Place(0m 0m) Place(1m 1m)])').toClipSVGPath(0, 0)).toBe(
        '',
    );
});

test('a form that encloses an area frames itself the way it draws itself', () => {
    // The default is the whole point: only an open form needs the two to differ.
    for (const form of [
        toRectangle(evaluateCode('Rectangle(-1m 1m 1m -1m)') as StructureValue),
        toCircle(evaluateCode('Circle(2m)')),
        toPolygon(evaluateCode('Polygon(2m 6)')),
        path('Path([Place(0m 0m) Place(2m 0m) Place(1m 2m)] closed: ⊤)'),
    ]) {
        expect(form?.toClipSVGPath(3, 4)).toBe(form?.toSVGPath(3, 4));
    }
});

test('a path lies at its own depth, not its points', () => {
    // A Form has one z, one box and one clip, so a path flattens to a plane either way;
    // saying so in an input beats making the first point's z secretly special.
    expect(path(`Path(${Zigzag})`).getZ()).toBe(0);
    expect(path(`Path(${Zigzag} z: 3m)`).getZ()).toBe(3);
    expect(path('Path([Place(0m 0m 9m) Place(1m 1m 9m)])').getZ()).toBe(0);
});
