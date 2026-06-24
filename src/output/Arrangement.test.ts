import { test, expect } from 'vitest';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import { toRow } from '@output/Row';
import { toGrid } from '@output/Grid';
import Shape, { toShape } from '@output/Shape';
import type Arrangement from '@output/Arrangement';
import { NameGenerator, DefaultSize } from '@output/Stage';
import RenderContext from '@output/RenderContext';
import { reflectX } from '@output/Place';
import type { WritingDirection } from '@locale/Scripts';

/** Evaluate an output expression to its value within its own default project. */
function evalValue(code: string) {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    return { project, value: evaluator.getInitialValue() };
}

/** A Shape whose layout size comes from its Rectangle form, so layout is
 *  deterministic and doesn't depend on a browser DOM (unlike Phrase). */
function rect(dimensions: string): Shape {
    const { project, value } = evalValue(`Shape(Rectangle(${dimensions}))`);
    const shape = toShape(project, value, new NameGenerator());
    if (shape === undefined) throw new Error('expected a Shape');
    return shape;
}

/** A RenderContext whose project locale drives the given writing direction. */
function contextFor(direction: WritingDirection) {
    const locales = new Locales(
        concretize,
        // Arabic's dominant script is RTL; the default locale (English) is LTR.
        [direction === 'rtl' ? { ...DefaultLocale, language: 'ar' } : DefaultLocale],
        DefaultLocale,
    );
    expect(locales.getDirection()).toBe(direction);
    return new RenderContext(
        DefaultLocale.ui.font.app,
        DefaultSize,
        locales,
        new Set(),
        1,
        'horizontal-tb',
    );
}

function arrangementFrom(
    code: string,
    to: (v: Value | undefined) => Arrangement | undefined,
) {
    const { value } = evalValue(code);
    const arrangement = to(value);
    if (arrangement === undefined) throw new Error(`expected an arrangement from ${code}`);
    return arrangement;
}

// Two rectangles of widths 2m and 4m.
const narrow = () => rect('0m 2m 2m 0m');
const wide = () => rect('0m 4m 4m 0m');

test('reflectX mirrors an x coordinate within a container', () => {
    // A 2-wide item at x=0 in a 10-wide container lands at the far end.
    expect(reflectX(0, 2, 10)).toBe(8);
    // Reflecting twice is the identity.
    expect(reflectX(reflectX(3, 2, 10), 2, 10)).toBe(3);
});

test('a Row lays children left-to-right under LTR', () => {
    const row = arrangementFrom('Row()', toRow);
    const { places } = row.getLayout([narrow(), wide()], contextFor('ltr'));
    expect(places).toHaveLength(2);
    expect(places[0][1].x).toBe(0);
    expect(places[0][1].x).toBeLessThan(places[1][1].x);
});

test('a Row mirrors children right-to-left under RTL', () => {
    const row = arrangementFrom('Row()', toRow);
    const { places } = row.getLayout([narrow(), wide()], contextFor('rtl'));
    expect(places).toHaveLength(2);
    // The first (logical) child now sits toward the inline-end (right).
    expect(places[0][1].x).toBeGreaterThan(places[1][1].x);
    // The last (logical) child anchors at the inline-start (x=0).
    expect(places[1][1].x).toBe(0);
});

test('a Grid mirrors its columns under RTL', () => {
    const ltr = arrangementFrom('Grid(1 2)', toGrid).getLayout(
        [narrow(), wide()],
        contextFor('ltr'),
    );
    const rtl = arrangementFrom('Grid(1 2)', toGrid).getLayout(
        [narrow(), wide()],
        contextFor('rtl'),
    );
    // First cell precedes the second under LTR, and follows it under RTL.
    expect(ltr.places[0][1].x).toBeLessThan(ltr.places[1][1].x);
    expect(rtl.places[0][1].x).toBeGreaterThan(rtl.places[1][1].x);
});
