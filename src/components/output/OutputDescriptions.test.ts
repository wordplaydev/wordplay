import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import type { Moved, OutputsByName } from '@output/animation/Animator';
import type Output from '@output/Output/Output';
import { toStage } from '@output/Output/Stage';
import { createPlace } from '@output/Place/Place';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';
import {
    describeEnteredOutput,
    describeMovedOutput,
    describedChangedOutput,
} from './OutputDescriptions';

/**
 * Evaluate a program and hand back the outputs its stage renders. Mirrors
 * evaluate.ts, which returns only a Value — `toStage` needs the Evaluator too.
 */
function outputs(code: string): Output[] {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const value = evaluator.getInitialValue();
    if (value === undefined) throw new Error(`No value from ${code}`);
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error(`No stage from ${code}`);
    return stage.content.filter((output): output is Output => output !== null);
}

/** The animator keys outputs by name; the names themselves don't matter here. */
function byName(list: Output[]): OutputsByName {
    return new Map(list.map((output, index) => [`${index}`, output]));
}

function movedFrom(list: Output[]): Moved {
    const project = Project.make(
        null,
        'test',
        new Source('test', '1'),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const orientation = {
        place: createPlace(evaluator, 0, 0, 0),
        rotation: undefined,
    };
    return new Map(
        list.map((output, index) => [
            `${index}`,
            { output, prior: orientation, present: orientation },
        ]),
    );
}

test('entered names each output that arrived', () => {
    const description = describeEnteredOutput(
        DefaultLocales,
        byName(outputs(`Stage([Phrase('hi') Phrase('bye')])`)),
    );
    expect(description).toContain('hi');
    expect(description).toContain('bye');
});

test('entered describes output that is not a phrase', () => {
    // Groups and shapes were skipped, which left the word "new" with nothing
    // after it once the stage became the only describer.
    const description = describeEnteredOutput(
        DefaultLocales,
        byName(
            outputs(
                `Stage([Group(Row() [Phrase('a')]) Shape(Rectangle(0m 0m 1m 1m))])`,
            ),
        ),
    );
    // Both are named: filtering to phrases left the word "new" and nothing else.
    expect(description).toContain('row');
    expect(description).toContain('Rectangle');
});

test('entered says nothing when only a Say arrived', () => {
    // Speech synthesis already voices a Say; describing it here would deliver
    // it twice, so the caller falls through to what changed or moved.
    expect(
        describeEnteredOutput(
            DefaultLocales,
            byName(outputs(`Stage([Say('hello')])`)),
        ),
    ).toBeUndefined();
});

test('entered skips a Say among describable output', () => {
    const description = describeEnteredOutput(
        DefaultLocales,
        byName(outputs(`Stage([Phrase('hi') Say('hello')])`)),
    );
    expect(description).toContain('hi');
    expect(description).not.toContain('hello');
});

test('entered says nothing when nothing entered', () => {
    expect(describeEnteredOutput(DefaultLocales, new Map())).toBeUndefined();
});

test('changed reports only output whose description differs', () => {
    const [before] = [outputs(`Stage([Phrase('hi')])`)];
    const after = outputs(`Stage([Phrase('bye')])`);
    const description = describedChangedOutput(
        DefaultLocales,
        new Map(),
        byName(after),
        byName(before),
    );
    expect(description).toContain('bye');
});

test('changed says nothing when nothing changed', () => {
    const before = outputs(`Stage([Phrase('hi')])`);
    const after = outputs(`Stage([Phrase('hi')])`);
    expect(
        describedChangedOutput(
            DefaultLocales,
            new Map(),
            byName(after),
            byName(before),
        ),
    ).toBeUndefined();
});

test('changed skips a Say', () => {
    const before = outputs(`Stage([Say('one')])`);
    const after = outputs(`Stage([Say('two')])`);
    expect(
        describedChangedOutput(
            DefaultLocales,
            new Map(),
            byName(after),
            byName(before),
        ),
    ).toBeUndefined();
});

test('moved skips a Say', () => {
    expect(
        describeMovedOutput(
            DefaultLocales,
            movedFrom(outputs(`Stage([Say('hello')])`)),
        ),
    ).toBe('');
});

test('moved names output that moved', () => {
    expect(
        describeMovedOutput(
            DefaultLocales,
            movedFrom(outputs(`Stage([Phrase('hi')])`)),
        ),
    ).toContain('hi');
});
