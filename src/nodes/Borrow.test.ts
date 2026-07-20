import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Choice from '@input/Choice';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import evaluateCode from '@runtime/evaluate';
import ExceptionValue from '@values/ExceptionValue';
import { expect, test } from 'vitest';

test.each([
    [
        `
Time()
`,
        [],
        '0ms',
    ],
    [
        `
        ↓ sup1
        sup1
    `,
        [`0`],
        '0',
    ],
    [
        `↓ sup1.a
        a
        `,
        [`↑ a: 0`],
        '0',
    ],
])('Expect %s to be %s', (code, supplements, value) => {
    expect(evaluateCode(code, supplements)?.toString()).toBe(value);
});

// Regression: a Borrow was eligible for the reuse-prior-value fast path, but its
// value comes from an inner Evaluation its Start launches and its purpose is the
// side effect of binding the borrowed names. Skipping it left the names unbound
// and its Finish popping an empty stack, so any stream change in a project with a
// borrowed source (e.g. the CodeGap example's data tables) threw a ValueException.
test('a borrowed source survives a stream reevaluation', () => {
    const main = new Source(
        'main',
        `↓ data

choice: Choice()
current: 'a' … ∆ choice … choice
[current data]`,
    );
    const project = Project.make(
        null,
        'test',
        main,
        [new Source('data', `1`)],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.getInitialValue();
    evaluator.play();

    expect(evaluator.getLatestSourceValue(main)?.toString()).toBe('["a" 1]');

    for (const name of ['b', 'c']) {
        evaluator.singletonReact(Choice, (stream) => stream.react(name));
        expect(evaluator.exception).toBeUndefined();
        const value = evaluator.getLatestSourceValue(main);
        expect(value).not.toBeInstanceOf(ExceptionValue);
        // The borrowed name must still be bound after the reevaluation.
        expect(value?.toString()).toBe(`["${name}" 1]`);
    }

    evaluator.stop();
});
