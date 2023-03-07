import { test, expect } from 'vitest';
import Project from '../models/Project';
import Source from './Source';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Value from '@runtime/Value';
import Time from '../input/Time';
import type Expression from './Expression';
import Evaluator from '../runtime/Evaluator';

const makeOne = (creator: Expression) => Time.make(creator, 1);

test.each([
    // Check stream resolution.
    [`time() > 0ms`, makeOne, FALSE_SYMBOL, TRUE_SYMBOL],
    // Check stream references.
    [`time() + 500ms`, makeOne, '500ms', '501ms'],
    // Check reaction binding.
    [`a: ∆ time() ? 1 … a + 1\na`, makeOne, '1', '2'],
    // Check reactions in evaluations.
    [
        `
        ƒ mult(a•# b•#) a · b
        b: mult(2 ∆ time() ? 1 … 2)
        b
        `,
        makeOne,
        '2',
        '4',
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
        const project = new Project(null, 'test', source, []);
        const evaluator = new Evaluator(project);

        evaluator.start();

        // Check the latest value of the source
        const actualInitial = evaluator.getLatestSourceValue(source);
        expect(actualInitial?.toString()).toBe(expectedInitial);

        // Add the given value to the stream
        const stream = Array.from(evaluator.nativeStreams.values())[0][0];
        expect(stream).not.toBeUndefined();
        stream?.add(value(source));

        // Manually flush reactions, since time is pooled.
        evaluator.flush();

        // Verify that the source has the new value
        const actualNext = evaluator.getLatestSourceValue(source);
        expect(actualNext?.toString()).toBe(expectedNext);
        evaluator.stop();
    }
);
