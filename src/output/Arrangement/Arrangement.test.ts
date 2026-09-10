import { test, expect } from 'vitest';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import { toRow } from '@output/Arrangement/Row';
import { toGrid } from '@output/Arrangement/Grid';
import Shape, { toShape } from '@output/Output/Shape/Shape';
import Music, { toMusic } from '@output/Music/Music';
import Group from '@output/Output/Group';
import { toStack } from '@output/Arrangement/Stack';
import type Arrangement from '@output/Arrangement/Arrangement';
import { NameGenerator, DefaultSize, toStage } from '@output/Output/Stage';
import RenderContext from '@output/RenderContext';
import { reflectX } from '@output/Place/Place';
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
    return { project, evaluator, value: evaluator.getInitialValue() };
}

/** The Stage a program evaluates to, for asking what its layout reports. */
function stageFrom(code: string) {
    const { evaluator, value } = evalValue(code);
    if (value === undefined) throw new Error(`no value from ${code}`);
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error(`expected a Stage from ${code}`);
    return stage;
}

/** A Shape whose layout size comes from its Rectangle form, so layout is
 *  deterministic and doesn't depend on a browser DOM (unlike Phrase). */
function rect(dimensions: string): Shape {
    const { project, value } = evalValue(`Shape(Rectangle(${dimensions}))`);
    const shape = toShape(project, value, new NameGenerator());
    if (shape === undefined) throw new Error('expected a Shape');
    return shape;
}

/** A Music, which is heard rather than seen and so has no layout footprint. */
function music(): Music {
    const { project, value } = evalValue('Music(Track([1]))');
    const result = toMusic(project, value, new NameGenerator());
    if (result === undefined) throw new Error('expected a Music');
    return result;
}

/** A RenderContext whose project locale drives the given writing direction. */
function contextFor(direction: WritingDirection) {
    const locales = new Locales(
        concretize,
        // Arabic's dominant script is RTL; the default locale (English) is LTR.
        [
            direction === 'rtl'
                ? { ...DefaultLocale, language: 'ar' }
                : DefaultLocale,
        ],
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
    if (arrangement === undefined)
        throw new Error(`expected an arrangement from ${code}`);
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

test('a Stack keeps every child at its own y, even with small padding', () => {
    // Regression: y was snapped to 0 whenever it rounded to 0, which collapsed
    // every child landing within half a meter of the baseline onto one row. With
    // a padding smaller than that band, the last children overlapped exactly.
    // Sized so the last two children land inside the old half-meter snap band:
    // the bottom child sits at y=0 and the one above it at 0.4.
    const stack = arrangementFrom("Stack('|' 0.1m)", toStack);
    // Three 2m-wide, 0.3m-tall rectangles.
    const children = [
        rect('0m 0.3m 2m 0m'),
        rect('0m 0.3m 2m 0m'),
        rect('0m 0.3m 2m 0m'),
    ];
    const { places } = stack.getLayout(children, contextFor('ltr'));
    const ys = places.map(([, place]) => place.y);
    expect(new Set(ys).size).toBe(ys.length);
    // Children descend, spaced by their height plus the padding.
    expect(ys[0] - ys[1]).toBeCloseTo(0.4, 5);
    expect(ys[1] - ys[2]).toBeCloseTo(0.4, 5);
});

test('a Stack gives a footprintless child no padding of its own', () => {
    // Music takes no room in the layout, so padding it apart from its siblings
    // opens a gap around nothing — which is what put an empty meter above a
    // lone phrase that shared its program with a Music.
    const stack = arrangementFrom("Stack('|' 1m)", toStack);
    const alone = stack.getLayout([rect('0m 2m 2m 0m')], contextFor('ltr'));
    const withMusic = stack.getLayout(
        [music(), rect('0m 2m 2m 0m')],
        contextFor('ltr'),
    );
    expect(withMusic.height).toBeCloseTo(alone.height, 5);
    // The rectangle still sits on the stack's baseline, not a meter above it.
    expect(withMusic.places[1][1].y).toBeCloseTo(alone.places[0][1].y, 5);
    // A trailing Music doesn't push the stack's bounds past its content either.
    const trailing = stack.getLayout(
        [rect('0m 2m 2m 0m'), music()],
        contextFor('ltr'),
    );
    expect(trailing.height).toBeCloseTo(alone.height, 5);
    expect(trailing.bottom).toBeCloseTo(alone.bottom, 5);
});

test('a Stack still pads its visible children apart', () => {
    // Regression guard for the fix above: the padding a Music no longer earns
    // must not go missing between the rectangles around it.
    const stack = arrangementFrom("Stack('|' 1m)", toStack);
    const { places, height } = stack.getLayout(
        [rect('0m 2m 2m 0m'), music(), rect('0m 2m 2m 0m')],
        contextFor('ltr'),
    );
    // Two 2m rectangles with one meter between them.
    expect(height).toBeCloseTo(5, 5);
    expect(places[0][1].y - places[2][1].y).toBeCloseTo(3, 5);
});

test('a Row gives a footprintless child no padding of its own', () => {
    const row = arrangementFrom("Row('|' 1m)", toRow);
    const alone = row.getLayout([narrow()], contextFor('ltr'));
    const withMusic = row.getLayout([music(), narrow()], contextFor('ltr'));
    expect(withMusic.width).toBeCloseTo(alone.width, 5);
    expect(withMusic.places[1][1].x).toBeCloseTo(alone.places[0][1].x, 5);
    const trailing = row.getLayout([narrow(), music()], contextFor('ltr'));
    expect(trailing.width).toBeCloseTo(alone.width, 5);
    expect(trailing.right).toBeCloseTo(alone.right, 5);
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

/**
 * Who decides where a child sits.
 *
 * An arrangement places its children, translating each one's geometry to where
 * it says. A place the creator *wrote* overrides that on the axis an
 * arrangement merely aligns — a Stack's x, a Row's y — but a `Shape` has no
 * `place` input at all, so the place it carries restates its form and is not a
 * request. Before this, a shape's form coordinates silently beat the alignment
 * the creator asked for, because a guard removed in Feb 2023 met a constructor
 * added seven months later.
 */

test('a Stack centres a shape rather than reading its form as a position', () => {
    const stack = arrangementFrom("Stack('|')", toStack);
    // 2m wide against a 4m-wide sibling, and anchored at its own x = 1.
    const { places } = stack.getLayout(
        [rect('1m 1m 3m 0m'), rect('0m 1m 4m 0m')],
        contextFor('ltr'),
    );
    // Centred in the 4m stack, not pinned to the form's left edge at 1m.
    expect(places[0][1].x).toBeCloseTo(1, 5);
    expect(places[1][1].x).toBeCloseTo(0, 5);
});

test('a Stack still yields the cross axis to a place the creator wrote', () => {
    // A Group carries the place here because a Phrase cannot be laid out without
    // a DOM and a Shape has no place to write; `heard()` gives it no footprint,
    // so the stack is 0 wide and centring would put both children at x = 0.
    const stage = stageFrom(`Stage([
        Group(Stack('|') [
            Group(Free() [${heard()}] place: Place(2m 0m))
            Group(Free() [${heard()}])
        ])
    ])`);
    const group = stage.content[0];
    if (!(group instanceof Group)) throw new Error('expected a Group');
    const { places } = group.layout.getLayout(group.content, contextFor('ltr'));
    expect(places[0][1].x).toBe(2);
    expect(places[1][1].x).toBe(0);
});

test('a Row aligns a shape rather than reading its form as a position', () => {
    const row = arrangementFrom("Row('|')", toRow);
    // A 1m-tall shape anchored at y = 2, beside a 3m-tall one.
    const { places } = row.getLayout(
        [rect('0m 3m 1m 2m'), rect('0m 3m 1m 0m')],
        contextFor('ltr'),
    );
    // Centred down the 3m row, not left at the form's own y of 2.
    expect(places[0][1].y).toBeCloseTo(1, 5);
});

test('a Free group places every kind where it says, not just a phrase', () => {
    const stage = stageFrom(`Stage([
        Group(Free() [
            Group(Free() [${heard()}] place: Place(3m 4m))
        ])
    ])`);
    const outer = stage.content[0];
    if (!(outer instanceof Group)) throw new Error('expected a Group');
    const { places } = outer.layout.getLayout(outer.content, contextFor('ltr'));
    expect([places[0][1].x, places[0][1].y]).toEqual([3, 4]);
});

/**
 * The camera's zoom-in bound follows the nearest thing on stage, so every container reports
 * the nearest z beneath it. z is absolute rather than relative to a parent's place
 * (`Place.offset` deliberately leaves it alone), so this is a plain minimum with no
 * accumulation — which is what these tests really pin down.
 *
 * Groups carry the z here because a `Shape` has no place of its own (it offsets instead) and
 * a `Phrase` cannot be laid out without a DOM. `Music` is the footprint-free filler a Group
 * will accept.
 */
const heard = () => 'Music(Track([1]))';

test('a stage with nothing placed forward reports the stage plane', () => {
    // Seeded at 0 to match how the x/y bounds seed at the origin: content lives on the
    // plane unless a project says otherwise.
    expect(stageFrom('Stage([])').getLayout(contextFor('ltr')).nearest).toBe(0);
    expect(
        stageFrom(`Stage([Group(Free() [${heard()}])])`).getLayout(
            contextFor('ltr'),
        ).nearest,
    ).toBe(0);
});

test('a stage reports the nearest of its placed children', () => {
    const stage = stageFrom(`Stage([
        Group(Free() [${heard()}] place: Place(z: -3m))
        Group(Free() [${heard()}])
    ])`);
    expect(stage.getLayout(contextFor('ltr')).nearest).toBe(-3);
});

test('a stage reaches through an arrangement to a nested z', () => {
    // The reason the layout type carries `nearest` rather than the Stage simply reading its
    // own children's places: an arrangement holds its children's places, so a z nested
    // inside one is invisible from the top.
    for (const [arrangement, z] of [
        ['Row()', -5],
        ['Stack()', -6],
    ] as const) {
        const stage = stageFrom(`Stage([
            Group(${arrangement} [
                Group(${arrangement} [${heard()}] place: Place(z: ${z}m))
            ])
        ])`);
        expect(stage.getLayout(contextFor('ltr')).nearest).toBe(z);
    }
});

test('nearest reports the z an arrangement actually lays out at', () => {
    // No arrangement arranges depth, so every one of them lays a child out at
    // the z it was given, and `nearest` bounds the camera against a depth
    // something really occupies. Free used to honour only a Phrase's place and
    // Grid used to hardcode its cells to the stage plane, so both drew a nested
    // Group at 0 whatever place it had.
    for (const arrangement of ['Free()', 'Grid(1 1)', 'Row()', 'Stack()']) {
        const stage = stageFrom(`Stage([
            Group(${arrangement} [
                Group(${arrangement} [${heard()}] place: Place(z: -4m))
            ])
        ])`);
        expect(stage.getLayout(contextFor('ltr')).nearest, arrangement).toBe(
            -4,
        );
    }
});
