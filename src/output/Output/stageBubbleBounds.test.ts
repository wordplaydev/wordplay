import { expect, test, vi } from 'vitest';

// No canvas in node, so text measurement is stood in for. Precedent:
// src/output/physics/contacts.test.ts.
vi.mock('@output/Output/getTextMetrics', () => ({
    default: (text: string, cssFont: string) => {
        const px = Number(/(\d+(?:\.\d+)?)px/.exec(cssFont)?.[1] ?? 64);
        return {
            width: text.length * 10 * (px / 64),
            actualBoundingBoxAscent: 0.7 * px,
            actualBoundingBoxDescent: 0.1 * px,
            fontBoundingBoxAscent: 0.8 * px,
            fontBoundingBoxDescent: 0.2 * px,
        };
    },
}));

const { DB } = await import('@db/Database');
const { default: Project } = await import('@db/projects/Project');
const { default: DefaultLocale } = await import('@locale/DefaultLocale');
const { default: Source } = await import('@nodes/Source');
const { toStage } = await import('@output/Output/Stage');
const { default: Evaluator } = await import('@runtime/Evaluator');
const { default: RenderContext } = await import('@output/RenderContext');
const { default: Locales } = await import('@locale/Locales');
const { default: concretize } = await import('@locale/concretize');

function layoutOf(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    const stage = value ? toStage(evaluator, value) : undefined;
    if (stage === undefined) throw new Error(`No stage from ${code}`);
    const context = new RenderContext(
        'Noto Sans',
        1,
        new Locales(concretize, [DefaultLocale], DefaultLocale),
        new Set(),
        1,
        'horizontal-tb',
    );
    return stage.getLayout(context);
}

test('a speech bubble widens the bounds the camera frames', () => {
    const plain = layoutOf(`Stage([Phrase('a')])`);
    const bubbled = layoutOf(`Stage([Phrase('a' bubble: 'hello there')])`);
    // The bubble sits above by default, so the top of the box moves up.
    expect(bubbled.top).toBeGreaterThan(plain.top);
});

test('a speech bubble does not resize the stage itself', () => {
    // The bounds grow but width/height must not: an arrangement makes no room
    // for a bubble, and nothing on stage moves when someone starts talking.
    const plain = layoutOf(`Stage([Phrase('a')])`);
    const bubbled = layoutOf(`Stage([Phrase('a' bubble: 'hello there')])`);
    expect(bubbled.width).toBeCloseTo(plain.width, 10);
    expect(bubbled.height).toBeCloseTo(plain.height, 10);
});

test('a bubble inside a group still reaches the stage bounds', () => {
    const plain = layoutOf(`Stage([Group(Stack() [Phrase('a')])])`);
    const bubbled = layoutOf(
        `Stage([Group(Stack() [Phrase('a' bubble: 'hello there')])])`,
    );
    expect(bubbled.top).toBeGreaterThan(plain.top);
});

test('a stage with no bubbles reports exactly what it always did', () => {
    const layout = layoutOf(`Stage([Phrase('a')])`);
    expect(layout.overflow).toBeUndefined();
    expect(layout.left).toBeLessThanOrEqual(0);
});

test('the side chosen for each bubble is reported for the renderer', () => {
    const layout = layoutOf(`Stage([Phrase('a' bubble: 'hi')])`);
    expect(layout.sides?.size).toBe(1);
    expect([...(layout.sides?.values() ?? [])][0]).toBe('↑');
});
