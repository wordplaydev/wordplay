import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Group from '@output/Output/Group';
import Shape from '@output/Output/Shape/Shape';
import { toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/**
 * What a `Group`'s content list accepts.
 *
 * It excluded `Shape` from December 2023 until now, and that was an omission in
 * a commit about disallowing stages inside stages rather than a rule: the
 * renderer, the arrangements and the converters had all handled shapes the whole
 * time. It also kept a `Scene` out of every layout, since a scene's value type
 * is `Phrase|Group|Shape`.
 */
function conflicts(code: string): string[] {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    // `analyze()` is what computes them. `getConflicts()` only reads a cached
    // analysis, so an unanalyzed project reports none however broken it is.
    return Array.from(project.analyze().conflictedNodes.values())
        .flat()
        .map((conflict) => conflict.constructor.name);
}

function stageFrom(code: string) {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    return value ? toStage(evaluator, value) : undefined;
}

test('a Group takes a Shape', () => {
    expect(
        conflicts(`Group(Stack() [Shape(Circle(1m)) Phrase('hi')])`),
    ).toEqual([]);
});

test('a Shape in a Group reaches the stage as a Shape', () => {
    const stage = stageFrom(`Group(Stack() [Shape(Circle(1m)) Phrase('hi')])`);
    const group = stage?.content[0];
    expect(group).toBeInstanceOf(Group);
    expect(
        group instanceof Group ? group.content[0] : undefined,
    ).toBeInstanceOf(Shape);
});

test('a Scene goes in a Group, which is what the widening was for', () => {
    // A scene's value is Phrase|Group|Shape, so every member has to be legal
    // content or none of it is.
    expect(
        conflicts(
            `Group(Stack() [Scene([Phrase('a') Phrase('b')]) Phrase('1 of 2')])`,
        ),
    ).toEqual([]);
});

test('a Stage still refuses a Stage', () => {
    // The commit that dropped Shape was really about this, and it still holds.
    expect(conflicts(`Stage([Stage([Phrase('a')])])`)).not.toEqual([]);
});
