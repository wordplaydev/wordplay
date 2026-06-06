import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import { getNumber } from '@components/palette/editOutput';
import {
    getFormAnchor,
    scaleForm,
    translateFormTo,
} from '@edit/output/editShape';

/** Build a project from a Shape program and return the form Evaluate + context. */
function form(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const evaluate = source.expression
        .nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                (n.is(project.shares.output.Rectangle, context) ||
                    n.is(project.shares.output.Circle, context) ||
                    n.is(project.shares.output.Polygon, context)),
        );
    if (evaluate === undefined) throw new Error('no form');
    return { project, form: evaluate, context };
}

/** Read the numeric value of a form input by index. */
function coordAt(
    project: Project,
    def: Evaluate,
    index: number,
    context = project.getContext(project.getMain()),
) {
    const fun = def.getFunction(context);
    const input = fun ? def.getInput(fun.inputs[index], context) : undefined;
    return input instanceof Evaluate ? undefined : getNumber(input as never);
}

test('getFormAnchor: rectangle uses min-left / max-top regardless of coord order', () => {
    const { project, form: f, context } = form(`Shape(Rectangle(1m 2m 3m 4m))`);
    // left=1,top=2,right=3,bottom=4 → anchor (min(1,3), max(2,4)) = (1, 4)
    expect(getFormAnchor(project, f, context)).toEqual({ x: 1, y: 4 });
});

test('getFormAnchor: circle anchor is (x-radius, y+radius)', () => {
    const { project, form: f, context } = form(`Shape(Circle(2m 0m 0m))`);
    expect(getFormAnchor(project, f, context)).toEqual({ x: -2, y: 2 });
});

test('translateFormTo: rectangle translates all four edges by the anchor delta', () => {
    const { project, form: f, context } = form(`Shape(Rectangle(1m 2m 3m 4m))`);
    // anchor (1,4) → move to (5,5): dx=4, dy=1
    const moved = translateFormTo(project, f, context, 5, 5);
    expect(moved).toBeInstanceOf(Evaluate);
    expect(coordAt(project, moved!, 0, context)).toBe(5); // left 1+4
    expect(coordAt(project, moved!, 1, context)).toBe(3); // top 2+1
    expect(coordAt(project, moved!, 2, context)).toBe(7); // right 3+4
    expect(coordAt(project, moved!, 3, context)).toBe(5); // bottom 4+1
});

test('translateFormTo: circle moves its center by the anchor delta', () => {
    const { project, form: f, context } = form(`Shape(Circle(2m 0m 0m))`);
    // anchor (-2,2) → move to (0,0): dx=2, dy=-2
    const moved = translateFormTo(project, f, context, 0, 0);
    expect(coordAt(project, moved!, 0, context)).toBe(2); // radius unchanged
    expect(coordAt(project, moved!, 1, context)).toBe(2); // x 0+2
    expect(coordAt(project, moved!, 2, context)).toBe(-2); // y 0-2
});

test('scaleForm: rectangle scales about its center', () => {
    const {
        project,
        form: f,
        context,
    } = form(`Shape(Rectangle(-1m 1m 1m -1m))`);
    // center (0,0); scale 2
    const scaled = scaleForm(project, f, context, 2);
    expect(coordAt(project, scaled!, 0, context)).toBe(-2); // left
    expect(coordAt(project, scaled!, 1, context)).toBe(2); // top
    expect(coordAt(project, scaled!, 2, context)).toBe(2); // right
    expect(coordAt(project, scaled!, 3, context)).toBe(-2); // bottom
});

test('scaleForm: circle scales its radius (clamped to >= 0.1)', () => {
    const { project, form: f, context } = form(`Shape(Circle(2m 0m 0m))`);
    expect(
        coordAt(project, scaleForm(project, f, context, 1.5)!, 0, context),
    ).toBe(3);
    expect(
        coordAt(project, scaleForm(project, f, context, 0.01)!, 0, context),
    ).toBe(0.1);
});

test('translateFormTo bails on a computed (non-literal) coordinate', () => {
    const {
        project,
        form: f,
        context,
    } = form(`Shape(Rectangle((1m + 1m) 2m 3m 4m))`);
    expect(translateFormTo(project, f, context, 5, 5)).toBeUndefined();
});

test('getFormAnchor: polygon with default (unset) center resolves to (0,0)', () => {
    // Polygon(radius sides x:0m y:0m z:0m) — x/y are defaulted, not explicit.
    const { project, form: f, context } = form(`Shape(Polygon(4m 5))`);
    // anchor (x - radius, y + radius) = (0 - 4, 0 + 4)
    expect(getFormAnchor(project, f, context)).toEqual({ x: -4, y: 4 });
});

test('translateFormTo: polygon with default center can be moved (adds x/y binds)', () => {
    const { project, form: f, context } = form(`Shape(Polygon(4m 5))`);
    // anchor (-4,4) → move to (0,0): dx=4, dy=-4
    const moved = translateFormTo(project, f, context, 0, 0);
    expect(moved).toBeInstanceOf(Evaluate);
    expect(coordAt(project, moved!, 0, context)).toBe(4); // radius unchanged
    expect(coordAt(project, moved!, 1, context)).toBe(5); // sides unchanged
    expect(coordAt(project, moved!, 2, context)).toBe(4); // x 0+4
    expect(coordAt(project, moved!, 3, context)).toBe(-4); // y 0-4
});

test('translateFormTo: circle with default center can be moved', () => {
    const { project, form: f, context } = form(`Shape(Circle(2m))`);
    // anchor (0-2, 0+2) = (-2,2) → move to (0,0): dx=2, dy=-2
    const moved = translateFormTo(project, f, context, 0, 0);
    expect(moved).toBeInstanceOf(Evaluate);
    expect(coordAt(project, moved!, 0, context)).toBe(2); // radius unchanged
    expect(coordAt(project, moved!, 1, context)).toBe(2); // x 0+2
    expect(coordAt(project, moved!, 2, context)).toBe(-2); // y 0-2
});
