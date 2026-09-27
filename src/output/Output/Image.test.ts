import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import Image, { DefaultWidth, imageSize } from '@output/Output/Image';
import { toStage } from '@output/Output/Stage';
import analyzeOutput from '@output/PhotosensitivityAnalysis';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';
import { conflictsIn } from '@conflicts/TestUtilities';

/** Two rows of three, so nothing square can pass by accident. */
const grid = `[
    [🌈(10% 20 30°) 🌈(90% 5 200°) 🌈(40% 9 90°)]
    [🌈(50% 50 100°) 🌈(20% 10 300°) 🌈(70% 3 10°)]
]`;

function imageIn(code: string): Image | undefined {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    const stage = value ? toStage(evaluator, value) : undefined;
    return stage?.getOutput().find((output) => output instanceof Image);
}

test('a picture of colors becomes one output', () => {
    const image = imageIn(`Image(${grid} "my cat")`);
    expect(image).toBeDefined();
    expect(image?.getColumns()).toBe(3);
    expect(image?.getRows()).toBe(2);
    // No glyph function, so there is nothing to draw but the colors themselves.
    expect(image?.glyphs).toBeUndefined();
});

/**
 * The size rules, which are what a creator notices: giving one dimension keeps the
 * picture's shape, so drawing the same subject at more colors changes nothing but the
 * size of a square. Giving both is the only way to squash it.
 */
test.each([
    ['neither', undefined, undefined, DefaultWidth, (DefaultWidth * 2) / 3],
    ['width only', 6, undefined, 6, 4],
    ['height only', undefined, 4, 6, 4],
    ['both, squashed', 6, 6, 6, 6],
])('%s', (_, width, height, expectedWidth, expectedHeight) => {
    const size = imageSize(width, height, 3, 2);
    expect(size.width).toBeCloseTo(expectedWidth);
    expect(size.height).toBeCloseTo(expectedHeight);
});

test('an empty grid has no shape to keep, so it is square', () => {
    expect(imageSize(undefined, undefined, 0, 0)).toEqual({
        width: DefaultWidth,
        height: DefaultWidth,
    });
});

test('the sizes a program writes reach the picture', () => {
    expect(imageIn(`Image(${grid} "c" 6m)`)?.height).toBeCloseTo(4);
    expect(imageIn(`Image(${grid} "c" 6m 6m)`)?.height).toBeCloseTo(6);
});

/**
 * The translator runs during evaluation, inside the structure's own body, so nothing has
 * to call a creator's function from the render path — which `Evaluator.evaluateFunction`
 * exists for, has no callers, and was removed from the animation path once already.
 */
test('a glyph function is applied to every color', () => {
    const image = imageIn(`Image(${grid} "my cat" glyph: ƒ(c•🌈) "o")`);
    expect(image?.glyphs).toEqual([
        ['o', 'o', 'o'],
        ['o', 'o', 'o'],
    ]);
});

test('a recolor function replaces the colors that are drawn', () => {
    const image = imageIn(
        `Image(${grid} "my cat" recolor: ƒ(c•🌈) 🌈(0% 0 0°))`,
    );
    expect(
        image?.colors.flat().every((color) => color.lightness.toNumber() === 0),
    ).toBe(true);
});

test('with no recolor, the colors drawn are the ones given', () => {
    const image = imageIn(`Image(${grid} "my cat")`);
    expect(image?.colors[0]?.[0]?.lightness.toNumber()).toBeCloseTo(0.1);
});

/** The description is required because a grid of colors has no words of its own. */
test('a picture with no description is a conflict', () => {
    expect(conflictsIn(`Image(${grid})`)).toContain('MissingInput');
    expect(conflictsIn(`Image(${grid} "my cat")`)).toEqual([]);
});

test('a description says what it is and how big it is', () => {
    const image = imageIn(`Image(${grid} "my cat")`);
    expect(image?.getDescription(DefaultLocales)).toBe(
        'my cat, a picture 3 by 2',
    );
});

/**
 * An image is one output holding hundreds of colors, so counting outputs would let the
 * densest pattern a program can make — a photograph — past a check written for sixteen
 * shapes. The grid below spans the full lightness range.
 */
test('a high-contrast picture is a photosensitivity pattern risk', () => {
    const dense = `[${Array.from(
        { length: 4 },
        (_, row) =>
            `[${Array.from(
                { length: 5 },
                (__, column) =>
                    `🌈(${(row + column) % 2 === 0 ? 0 : 100}% 0 0°)`,
            ).join(' ')}]`,
    ).join(' ')}]`;
    const image = imageIn(`Image(${dense} "a checkerboard")`);
    expect(image).toBeDefined();
    if (image) expect(analyzeOutput(image).has('pattern')).toBe(true);
});

test('a picture of one lightness is not', () => {
    const flat = `[[🌈(50% 0 0°) 🌈(50% 0 0°)] [🌈(50% 0 0°) 🌈(50% 0 0°)]]`;
    const image = imageIn(`Image(${flat} "a grey square")`);
    expect(image).toBeDefined();
    if (image) expect(analyzeOutput(image).has('pattern')).toBe(false);
});

/** A ragged or non-color grid has no picture in it, and refusing is better than guessing. */
test.each([
    ['not a list of lists', `Image([🌈(50% 0 0°)] "x")`],
    ['not colors', `Image([[1 2]] "x")`],
])('%s is not a picture', (_, code) => {
    expect(imageIn(code)).toBeUndefined();
});

test('a ragged grid keeps the widest row as its width', () => {
    const image = imageIn(
        `Image([[🌈(50% 0 0°) 🌈(50% 0 0°) 🌈(50% 0 0°)] [🌈(50% 0 0°)]] "x")`,
    );
    expect(image?.getColumns()).toBe(3);
    expect(image?.getRows()).toBe(2);
});
