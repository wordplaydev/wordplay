import { test, expect } from 'vitest';
import Project from '../db/projects/Project';
import Source from './Source';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Value from '@values/Value';
import Time from '../input/Time';
import type Expression from './Expression';
import Evaluator from '@runtime/Evaluator';
import { testConflict } from '../conflicts/TestUtilities';
import Reaction from './Reaction';
import ExpectedStream from '../conflicts/ExpectedStream';
import { DB } from '../db/Database';
import DefaultLocale from '../locale/DefaultLocale';

const makeOne = (creator: Expression) => Time.make(creator, 1);

test.each([
    // Check stream resolution.
    [`Time() > 0ms`, makeOne, [FALSE_SYMBOL, TRUE_SYMBOL]],
    // Check stream references.
    [`Time() + 500ms`, makeOne, ['500ms', '501ms']],
    // Check reaction binding.
    [`a: 1 … ∆ Time() … a + 1\na`, makeOne, ['1', '2']],
    // Check reactions in evaluations.
    [
        `
        ƒ mult(a•# b•#) a · b
        b: mult(2 1 … ∆ Time() … 2)
        b
        `,
        makeOne,
        ['2', '4'],
    ],
    // Ensure that reactions are evaluated by count, just like other reactions.
    [
        `time: Time()\n['hi' 'ho'].translate(ƒ(val) val … ∆ time … 'no')`,
        makeOne,
        ['["hi" "ho"]', '["no" "no"]'],
    ],
    // Ensure that when time changes, we get a new random value
    // Phrase(∆ Time(1000ms) ? ["a" "b" "c" "d"].random() '')
    [
        `∆ Time() ? Random() 1`,
        makeOne,
        ['1', '0.7098480789645691', '0.9742682568175951'],
    ],
    // Ensure that time change in a list doesn't re-evaluate random in list
    [
        `[ Time() Random()][2]`,
        makeOne,
        ['0.7098480789645691', '0.7098480789645691'],
    ],
    // Ensure that time change in a list doesn't re-evaluate list random
    [`[ Time() [1 2 3].random()][2]`, makeOne, ['3', '3']],
])(
    'React to %s',
    (
        code: string,
        value: (expression: Expression) => Value,
        expectedValues: string[],
    ) => {
        // Make the project
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        // Specify a seed for testing purposes.
        const evaluator = new Evaluator(
            project,
            DB,
            [DefaultLocale],
            true,
            undefined,
            1,
        );

        // Start the evaluator
        evaluator.start();

        for (const expectedValue of expectedValues) {
            // Check the latest value of the source
            const actualInitial = evaluator.getLatestSourceValue(source);
            expect(actualInitial?.toString()).toBe(expectedValue);

            // Find the non-reaction stream created and add the requested value to it.
            const streams = Array.from(evaluator.streamsByCreator.keys()).find(
                (s) => !(s instanceof Reaction),
            );
            if (streams) {
                const values = evaluator.streamsByCreator.get(streams);
                if (values) {
                    const stream = values[0];
                    stream.add(value(source), null);
                }
                expect(values).not.toBeUndefined();
            } else expect(streams).not.toBeUndefined();

            // Manually flush reactions, since time is pooled.
            evaluator.flush();
        }

        evaluator.stop();
    },
);

testConflict('1 … ∆ Time() … 1 + .', '1 … ⊤ … 1 + .', Reaction, ExpectedStream);
