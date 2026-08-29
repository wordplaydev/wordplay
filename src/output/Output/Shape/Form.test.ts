import { test, expect } from 'vitest';
import DefaultLocales from '@locale/DefaultLocales';
import evaluateCode from '@runtime/evaluate';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { toCircle } from '@output/Output/Shape/Circle';
import { toPath } from '@output/Output/Shape/Path';
import { toPolygon } from '@output/Output/Shape/Polygon';
import { toRectangle } from '@output/Output/Shape/Rectangle';

test('Polygon clamps sides to a minimum of 3', () => {
    // Fewer than three sides is a degenerate polygon that draws nothing; render it as a triangle.
    expect(toPolygon(evaluateCode('Polygon(4m 1)'))?.sides).toBe(3);
    expect(toPolygon(evaluateCode('Polygon(4m 2)'))?.sides).toBe(3);
    expect(toPolygon(evaluateCode('Polygon(4m 0)'))?.sides).toBe(3);
});

test('Polygon rounds a fractional side count', () => {
    expect(toPolygon(evaluateCode('Polygon(4m 5.6)'))?.sides).toBe(6);
    expect(toPolygon(evaluateCode('Polygon(4m 4.4)'))?.sides).toBe(4);
});

/**
 * A frame's clip and its border have to describe the same region.
 *
 * GroupView draws the border from `toClipSVGPath` in the bounding box's own pixels and then
 * translates that SVG by the box's corner, while `toCSSClip` clips the element itself. So the
 * clip must equal the border plus that same translation. Circle and Polygon both read their
 * box-relative coordinates for the clip, which put a circular frame a radius down and right of
 * the border framing it — and Circle's `at y x` swap was invisible only because a circle's
 * box-relative centre has x equal to y.
 */
/** Every `x y` pair in a path or polygon string, in order. */
function pointsIn(text: string): [number, number][] {
    const numbers = (text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    const points: [number, number][] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2)
        points.push([numbers[i], numbers[i + 1]]);
    return points;
}

test.each([
    ['Rectangle(-6m 4m 2m -1m)', toRectangle],
    ['Polygon(3m 5 -2m 1m)', toPolygon],
    ['Path([Place(-4m 3m) Place(2m 5m) Place(3m -1m)] closed: ⊤)', toPath],
])('%s frames exactly the region it clips', (code, convert) => {
    const form = convert(evaluateCode(code) as never);
    if (form === undefined) throw new Error(`not a form: ${code}`);

    // Where GroupView puts the border SVG.
    const offsetX = form.getLeft() * PX_PER_METER;
    const offsetY = -form.getTop() * PX_PER_METER;

    const clip = pointsIn(form.toCSSClip());
    const border = pointsIn(form.toClipSVGPath(0, 0)).map(
        ([x, y]) => [x + offsetX, y + offsetY] as [number, number],
    );
    expect(clip.length).toBeGreaterThan(2);
    // Same corners, in the same order, once the border is put where it is drawn. A rectangle
    // repeats no corner; a path repeats its first, so compare the corners the clip names.
    for (const [index, [x, y]] of clip.entries()) {
        expect(border[index][0]).toBeCloseTo(x, 6);
        expect(border[index][1]).toBeCloseTo(y, 6);
    }
});

test('a circle frames exactly the region it clips', () => {
    const form = toCircle(evaluateCode('Circle(3m 1m 1m)'));
    if (form === undefined) throw new Error('not a circle');

    const offsetX = form.getLeft() * PX_PER_METER;
    const offsetY = -form.getTop() * PX_PER_METER;

    // circle(R at CX CY), against the border's `M cx cy m r,0 …`.
    const clip = form.toCSSClip().match(/circle\((\S+)px at (\S+)px (\S+)px\)/);
    if (clip === null) throw new Error(`unparsable clip: ${form.toCSSClip()}`);
    const border = pointsIn(form.toClipSVGPath(0, 0));

    expect(Number(clip[1])).toBeCloseTo(form.radius * PX_PER_METER, 6);
    expect(Number(clip[2])).toBeCloseTo(border[0][0] + offsetX, 6);
    expect(Number(clip[3])).toBeCloseTo(border[0][1] + offsetY, 6);
    // And that is the circle the program actually asked for, in stage pixels.
    expect(Number(clip[2])).toBeCloseTo(1 * PX_PER_METER, 6);
    expect(Number(clip[3])).toBeCloseTo(-1 * PX_PER_METER, 6);
});

/**
 * A form names itself with a word, not with its glyph.
 *
 * Every form's first name is now its symbol — `▭`, `●`, `⬢`, `╱` — which is what the insert
 * toolbar shows and what a creator types. Anything a screen reader speaks has to pick the
 * written name instead, or a shape's role description and its rotate/resize handles are read
 * out as punctuation (#1251 again).
 */
test.each([
    ['Rectangle(-1m 1m 1m -1m)', toRectangle, 'Rectangle'],
    ['Circle(2m)', toCircle, 'Circle'],
    ['Polygon(2m 6)', toPolygon, 'Polygon'],
    ['Path([Place(0m 0m) Place(1m 1m)])', toPath, 'Path'],
])('%s describes itself in words', (code, convert, expected) => {
    const form = convert(evaluateCode(code) as never);
    expect(form?.getDescription(DefaultLocales)).toBe(expected);
});
