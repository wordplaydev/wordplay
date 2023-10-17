import { test, expect } from 'vitest';
import Project from '../models/Project';
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
import Locales from '../locale/Locales';

const makeOne = (creator: Expression) => Time.make(creator, 1);

test.each([
    // Check stream resolution.
    [`Time() > 0ms`, makeOne, FALSE_SYMBOL, TRUE_SYMBOL],
    // Check stream references.
    [`Time() + 500ms`, makeOne, '500ms', '501ms'],
    // Check reaction binding.
    [`a: 1 … ∆ Time() … a + 1\na`, makeOne, '1', '2'],
    // Check reactions in evaluations.
    [
        `
        ƒ mult(a•# b•#) a · b
        b: mult(2 1 … ∆ Time() … 2)
        b
        `,
        makeOne,
        '2',
        '4',
    ],
    // Ensure that reactions are evaluated by count, just like other reactions.
    [
        `time: Time()\n['hi' 'ho'].translate(ƒ(val) val … ∆ time … 'no')`,
        makeOne,
        '["hi" "ho"]',
        '["no" "no"]',
    ],
])(
    'React to %s',
    (
        code: string,
        value: (expression: Expression) => Value,
        expectedInitial: string,
        expectedNext: string
    ) => {
        // Make the project
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const evaluator = new Evaluator(
            project,
            DB,
            new Locales([DefaultLocale], DefaultLocale)
        );

        evaluator.start();

        // Check the latest value of the source
        const actualInitial = evaluator.getLatestSourceValue(source);
        expect(actualInitial?.toString()).toBe(expectedInitial);

        // Add the given value to the stream
        const stream = Array.from(evaluator.streamsByCreator.values())[0][0];
        expect(stream).not.toBeUndefined();
        stream?.add(value(source), null);

        // Manually flush reactions, since time is pooled.
        evaluator.flush();

        // Verify that the source has the new value
        const actualNext = evaluator.getLatestSourceValue(source);
        expect(actualNext?.toString()).toBe(expectedNext);
        evaluator.stop();
    }
);

testConflict('1 … ∆ Time() … 1 + .', '1 … ⊤ … 1 + .', Reaction, ExpectedStream);
