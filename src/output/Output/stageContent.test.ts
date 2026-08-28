import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Group from '@output/Output/Group';
import Phrase from '@output/Output/Phrase';
import { toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/**
 * What a program's several result expressions become on stage.
 *
 * A program with more than one non-Bind result expression evaluates to a list,
 * and `toStage` used to collect that list's visible output into a synthesized
 * Group with a Stack arrangement. A Stack computes each child's y from a running
 * accumulator and never reads its `place.y`, so two placed phrases rendered
 * nowhere near where they said — and, because the group had no place of its own,
 * the stage recentered it and shifted every child's x too. These cover the flat
 * treatment that replaced it.
 */
function stageFrom(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    return value ? toStage(evaluator, value) : undefined;
}

test('two placed phrases keep the places they were given', () => {
    const stage = stageFrom(
        `Phrase('hello' place: Place(-2.3m 3.21m 0m))
Phrase('hello' place: Place(-1m 0.97m 0m))`,
    );
    const places = stage?.content.map((output) =>
        output?.place === undefined
            ? undefined
            : [output.place.x, output.place.y, output.place.z],
    );
    expect(places).toEqual([
        [-2.3, 3.21, 0],
        [-1, 0.97, 0],
    ]);
});

test('several visible outputs are stage children, not an implicit group', () => {
    // Not only a layout matter: Physics.sync skips any output whose first parent
    // is a Group, so the implicit group silently turned Motion and Collision off
    // for any program with two phrases in it, and freeAxes refused to move them
    // vertically. Nothing stands between them and the stage now.
    const stage = stageFrom(`Phrase('a')
Phrase('b')
Phrase('c')`);
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Phrase',
        'Phrase',
        'Phrase',
    ]);
    expect(stage?.content.some((output) => output instanceof Group)).toBe(
        false,
    );
});

test('a lone visible output is still a stage child', () => {
    const stage = stageFrom(`Phrase('a')`);
    expect(stage?.content).toHaveLength(1);
    expect(stage?.content[0]).toBeInstanceOf(Phrase);
});

test('a mix of output kinds stays flat', () => {
    const stage = stageFrom(`Phrase('a')
Shape(Rectangle(-1m 1m 1m -1m))`);
    expect(stage?.content.map((output) => output?.constructor.name)).toEqual([
        'Phrase',
        'Shape',
    ]);
});

test('a speech bubble’s Say is gathered separately from the stage’s own', () => {
    // getSays walks the content and never looks inside a Phrase, so a bubble's
    // Say needs its own gathering — kept apart because a bubble is already the
    // visual rendering of what it speaks and so must not also be captioned.
    const stage = stageFrom(
        `Stage([Phrase('a' bubble: Say('spoken')) Say('loose')])`,
    );
    expect(stage?.getSays().map((say) => say.text.text)).toEqual(['loose']);
    expect(stage?.getBubbleSays().map((say) => say.text.text)).toEqual([
        'spoken',
    ]);
});

test('a speech bubble’s Say is found inside a Group', () => {
    const stage = stageFrom(
        `Stage([Group(Stack() [Phrase('a' bubble: Say('nested'))])])`,
    );
    expect(stage?.getBubbleSays().map((say) => say.text.text)).toEqual([
        'nested',
    ]);
});

test('a shown speech bubble has nothing to speak', () => {
    const stage = stageFrom(`Stage([Phrase('a' bubble: 'shown only')])`);
    expect(stage?.getBubbleSays()).toHaveLength(0);
});
