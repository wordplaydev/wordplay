import DefaultLocales from '@locale/DefaultLocales';
import Shape, {
    FilledIndex,
    GlyphsIndex,
    StrokedIndex,
    toShape,
} from '@output/Output/Shape/Shape';
import { NameGenerator } from '@output/Output/Stage';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { DB } from '@db/Database';
import { expect, test } from 'vitest';

/** Evaluate a program to its Shape. */
function shapeFrom(code: string): Shape {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    const shape =
        value === undefined
            ? undefined
            : toShape(project, value, new NameGenerator());
    if (shape === undefined) throw new Error(`not a shape: ${code}`);
    return shape;
}

test('filled, stroked and glyphs sit where the code expects them', () => {
    // Everything else in Shape is read by fixed offset — getStyle's block, and editHandles'
    // hard-coded rotation bind — so these three were appended rather than placed beside
    // `color`, and nothing may quietly slide in front of them.
    const source = new Source('test', 'Shape(Circle(1m))');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const inputs = project.shares.output.Shape.inputs;
    expect(inputs[FilledIndex].names.getNames()).toContain('filled');
    expect(inputs[StrokedIndex].names.getNames()).toContain('stroked');
    expect(inputs[GlyphsIndex].names.getNames()).toContain('glyphs');
    // The bind editHandles rotates by, which appending must not have moved.
    expect(inputs[8].names.getNames()).toContain('rotation');
    expect(inputs[0].names.getNames()).toContain('form');
});

test('a shape is filled and stroked unless it says otherwise', () => {
    // Both default true, so nothing that renders today changes.
    const plain = shapeFrom('Shape(Circle(1m))');
    expect(plain.filled).toBe(true);
    expect(plain.stroked).toBe(true);
    expect(plain.glyphs).toBeUndefined();
    expect(plain.isVisible()).toBe(true);
});

test('a shape with no fill, no outline and no glyphs draws nothing', () => {
    // Legitimate rather than a mistake: a Shape on a Stage is a barrier whether or not it is
    // seen, so this is how a program makes an invisible wall.
    const invisible = shapeFrom('Shape(Circle(1m) filled: ⊥ stroked: ⊥)');
    expect(invisible.isVisible()).toBe(false);
    // Glyphs alone are still something to see.
    expect(
        shapeFrom(
            "Shape(Circle(1m) filled: ⊥ stroked: ⊥ glyphs: 'a')",
        ).isVisible(),
    ).toBe(true);
});

test('glyphs are read and spoken', () => {
    // The SVG that paints them is presentational, so the shape's own description is the only
    // place a screen reader hears them.
    const written = shapeFrom("Shape(Circle(1m) glyphs: 'hello')");
    expect(written.glyphs).toBe('hello');
    expect(written.getDescription(DefaultLocales)).toBe('Circle hello');
    // And a shape without them still describes itself as it did.
    expect(shapeFrom('Shape(Circle(1m))').getDescription(DefaultLocales)).toBe(
        'Circle',
    );
});

test('glyphs work on a path as well as on a closed form', () => {
    const drawn = shapeFrom(
        "Shape(Path([Place(0m 0m) Place(2m 2m)]) glyphs: '✦')",
    );
    expect(drawn.glyphs).toBe('✦');
    expect(drawn.getDescription(DefaultLocales)).toBe('Path ✦');
});
