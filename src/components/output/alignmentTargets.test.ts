import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Group from '@output/Output/Group';
import type Output from '@output/Output/Output';
import { toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';
import { freeAxes } from './alignmentTargets';

/**
 * Which axes a parent will actually honour, which is what decides whether the
 * editor may snap and announce a move. Nothing guarded this before, and it is
 * the one function that models the placement rule: an arrangement places its
 * children, a written place overrides the axis it merely aligns, and a `Shape`
 * has no place to write.
 */
function childOf(code: string): { parent: Output; child: Output } {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    const stage = value ? toStage(evaluator, value) : undefined;
    const parent = stage?.content[0];
    if (!(parent instanceof Group))
        throw new Error(`expected a Group: ${code}`);
    const child = parent.content[0];
    if (child === null || child === undefined)
        throw new Error(`expected a child: ${code}`);
    return { parent, child };
}

function axes(code: string) {
    const { parent, child } = childOf(code);
    return freeAxes(parent, child);
}

test('a stack frees the axis it aligns and holds the one it stacks', () => {
    expect(axes(`Group(Stack() [Phrase('a')])`)).toEqual({
        freeX: true,
        freeY: false,
    });
});

test('a row frees the axis it aligns and holds the one it fills', () => {
    expect(axes(`Group(Row() [Phrase('a')])`)).toEqual({
        freeX: false,
        freeY: true,
    });
});

test('a grid holds both, since it decides both', () => {
    expect(axes(`Group(Grid(1 1) [Phrase('a')])`)).toEqual({
        freeX: false,
        freeY: false,
    });
});

test('a shape has no free axis inside an arrangement, having no place to write', () => {
    // Its place restates its form, so an arrangement overrides it and a drag
    // would write coordinates nothing reads.
    expect(axes(`Group(Stack() [Shape(Circle(1m))])`)).toEqual({
        freeX: false,
        freeY: false,
    });
    expect(axes(`Group(Row() [Shape(Circle(1m))])`)).toEqual({
        freeX: false,
        freeY: false,
    });
});

test('a free group frees both axes, for every kind', () => {
    // It used to free them only for a phrase, mirroring a bug in Free.getLayout.
    for (const child of [`Phrase('a')`, `Shape(Circle(1m))`])
        expect(axes(`Group(Free() [${child}])`), child).toEqual({
            freeX: true,
            freeY: true,
        });
});

test('output with no group above it is free on both axes', () => {
    const { child } = childOf(`Group(Stack() [Phrase('a')])`);
    expect(freeAxes(undefined, child)).toEqual({ freeX: true, freeY: true });
});
