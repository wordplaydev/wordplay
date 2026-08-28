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
import { describe, expect, test } from 'vitest';
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

/** The Stage a program renders, for use as a change container. */
function stageOf(code: string): Output {
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
    return stage;
}

/** The animator keys outputs by name; the names themselves don't matter here. */
function byName(list: Output[]): OutputsByName {
    return new Map(list.map((output, index) => [`${index}`, output]));
}

function movedFrom(
    list: Output[],
    from: [number, number, number] = [0, 0, 0],
    to: [number, number, number] = [0, 0, 0],
    rotations: [number | undefined, number | undefined] = [
        undefined,
        undefined,
    ],
): Moved {
    const project = Project.make(
        null,
        'test',
        new Source('test', '1'),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const prior = {
        place: createPlace(evaluator, ...from),
        rotation: rotations[0],
    };
    const present = {
        place: createPlace(evaluator, ...to),
        rotation: rotations[1],
    };
    return new Map(
        list.map((output, index) => [`${index}`, { output, prior, present }]),
    );
}

/** What a single moved phrase announces, given a displacement. */
function movedPhrase(
    to: [number, number, number],
    rotations: [number | undefined, number | undefined] = [
        undefined,
        undefined,
    ],
): string {
    return describeMovedOutput(
        DefaultLocales,
        movedFrom(outputs(`Stage([Phrase('hi')])`), [0, 0, 0], to, rotations),
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

test('a shown speech bubble is described', () => {
    // A bubble that is only shown has no other voice, so its words have to
    // reach the description or a line of dialog is silent to a screen reader.
    const description = describeEnteredOutput(
        DefaultLocales,
        byName(outputs(`Stage([Phrase('a' bubble: 'hello')])`)),
    );
    expect(description).toContain('hello');
});

test('a spoken speech bubble is left out of the description', () => {
    // Given a Say, the bubble is voiced by speech synthesis, so describing it
    // here would deliver the same line twice — the bail Say itself gets above.
    const description = describeEnteredOutput(
        DefaultLocales,
        byName(outputs(`Stage([Phrase('a' bubble: Say('hello'))])`)),
    );
    expect(description).toContain('a');
    expect(description).not.toContain('hello');
});

test('two lines of dialog do not describe identically', () => {
    // An announcement whose text repeats is heard once and then sounds broken,
    // so what a bubble says has to be what varies between two firings.
    const first = describeEnteredOutput(
        DefaultLocales,
        byName(outputs(`Stage([Phrase('a' bubble: 'who are you?')])`)),
    );
    const second = describeEnteredOutput(
        DefaultLocales,
        byName(outputs(`Stage([Phrase('a' bubble: 'nobody in particular')])`)),
    );
    expect(first).toBeDefined();
    expect(first).not.toBe(second);
});

test('a changed bubble is reported as a change', () => {
    const before = outputs(`Stage([Phrase('a' bubble: 'hi')])`);
    const after = outputs(`Stage([Phrase('a' bubble: 'bye')])`);
    expect(
        describedChangedOutput(
            DefaultLocales,
            new Map(),
            byName(after),
            byName(before),
        ),
    ).toContain('bye');
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

describe('movement direction (#149)', () => {
    // Stage space: +y is up, +x is right. The eight names come from
    // ui.output.directions, read clockwise from up.
    test.each([
        [[0, 1, 0], 'up'],
        [[1, 1, 0], 'up and right'],
        [[1, 0, 0], 'right'],
        [[1, -1, 0], 'down and right'],
        [[0, -1, 0], 'down'],
        [[-1, -1, 0], 'down and left'],
        [[-1, 0, 0], 'left'],
        [[-1, 1, 0], 'up and left'],
    ])('moving to %s says %s', (to, expected) => {
        expect(movedPhrase(to as [number, number, number])).toContain(expected);
    });

    test('a move too small to see names no direction', () => {
        // Physics jitter and settling animations would otherwise announce a
        // direction on every frame.
        const description = movedPhrase([0.001, 0.001, 0]);
        expect(description).toContain('hi');
        for (const direction of ['up', 'down', 'left', 'right'])
            expect(description).not.toContain(direction);
    });

    test('the destination rides along, so repeats are heard', () => {
        // A screen reader won't re-read identical text, so pressing the same
        // arrow twice must not produce the same announcement twice.
        const first = movedPhrase([1, 0, 0]);
        const second = describeMovedOutput(
            DefaultLocales,
            movedFrom(outputs(`Stage([Phrase('hi')])`), [1, 0, 0], [2, 0, 0]),
        );
        expect(first).toContain('right');
        expect(second).toContain('right');
        expect(first).not.toBe(second);
    });

    test('depth moves say closer or farther', () => {
        expect(movedPhrase([0, 0, -1])).toContain('closer');
        expect(movedPhrase([0, 0, 1])).toContain('farther');
    });

    test('a turn in place says turned', () => {
        expect(movedPhrase([0, 0, 0], [0, 90])).toContain('turned');
    });

    test('movement in the plane wins over depth', () => {
        // A diagonal that also changes depth is described by what a viewer
        // notices first.
        const description = movedPhrase([0, 1, 1]);
        expect(description).toContain('up');
        expect(description).not.toContain('farther');
    });
});

describe('custom descriptions and volume (#555)', () => {
    test('a creator description wins over the generated one', () => {
        const list = outputs(`Stage([Phrase('hi' description: 'my cat')])`);
        expect(describeEnteredOutput(DefaultLocales, byName(list))).toContain(
            'my cat',
        );
    });

    test('a few changes are still listed individually', () => {
        const before = outputs(`Stage([Phrase('a') Phrase('b')])`);
        const after = outputs(`Stage([Phrase('c') Phrase('d')])`);
        const description = describedChangedOutput(
            DefaultLocales,
            new Map(),
            byName(after),
            byName(before),
            after[0],
        );
        expect(description).toContain('c');
        expect(description).toContain('d');
    });

    const manyBefore = `Stage([Phrase('alpha') Phrase('beta') Phrase('gamma') Phrase('delta')])`;
    const manyAfter = `Stage([Phrase('epsilon') Phrase('zeta') Phrase('eta') Phrase('theta')])`;

    test('successive summaries differ, so repeats are heard', () => {
        // A bare count and container are the same words every tick, and a
        // screen reader won't re-read unchanged text — the reason the
        // many-changes case sounded like silence.
        const grid = (start: number) =>
            `Stage([${Array.from(
                { length: 12 },
                (_, i) => `Phrase('${(i + start) % 10}')`,
            ).join(' ')}] description: 'my grid')`;
        const summary = (before: string, after: string) =>
            describedChangedOutput(
                DefaultLocales,
                new Map(),
                byName(outputs(after)),
                byName(outputs(before)),
                stageOf(after),
            );
        const first = summary(grid(0), grid(1));
        const second = summary(grid(1), grid(2));
        expect(first).toContain('12');
        expect(first).toContain('my grid');
        expect(first).not.toBe(second);
    });

    test('too many changes are summarized by their container', () => {
        // The Camera case: every pixel a Phrase, so a list is unlistenable.
        const description = describedChangedOutput(
            DefaultLocales,
            new Map(),
            byName(outputs(manyAfter)),
            byName(outputs(manyBefore)),
            stageOf(`Stage([Phrase('x')] description: 'my scene')`),
        );
        expect(description).toContain('4');
        // The container's own description stands in for the list.
        expect(description).toContain('my scene');
        // One example is named to keep the text varying; the rest are not, or
        // this would be the unlistenable list the summary exists to avoid.
        const named = ['epsilon', 'zeta', 'eta', 'theta'].filter((word) =>
            description?.includes(word),
        );
        expect(named).toHaveLength(1);
    });

    test('without a container, many changes still list', () => {
        const description = describedChangedOutput(
            DefaultLocales,
            new Map(),
            byName(outputs(manyAfter)),
            byName(outputs(manyBefore)),
        );
        expect(description).toContain('epsilon');
    });
});
