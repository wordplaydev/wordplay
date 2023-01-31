import { test, expect } from 'vitest';
import Project from '../models/Project';
import Source from './Source';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Value from '@runtime/Value';
import Time from '../input/Time';
import NoneType from './NoneType';

test.each([
    // Check stream resolution.
    [`time() > 0ms`, Time.make(NoneType.None, 1), FALSE_SYMBOL, TRUE_SYMBOL],
    // Check stream references.
    [`time() + 500ms`, Time.make(NoneType.None, 1), '500ms', '501ms'],
    // Check reaction binding.
    [`a: 1 … ∆ time(), a + 1\na`, Time.make(NoneType.None, 1), '1', '2'],
    // Check reactions in evaluations.
    [
        `
        ƒ mult(a•# b•#) a · b
        b: mult(2 1 … ∆ time(), 2)
        b
        `,
        Time.make(NoneType.None, 1),
        '2',
        '4',
    ],
])(
    'React to %s',
    (
        code: string,
        value: Value,
        expectedInitial: string,
        expectedNext: string
    ) => {
        // Make the project
        const source = new Source('test', code);
        const project = new Project('test', source, []);

        // Evaluate it
        project.evaluate();

        // Check the latest value of the source
        const actualIinitial = project.evaluator.getLatestSourceValue(source);
        expect(actualIinitial?.toString()).toBe(expectedInitial);

        // Add the given value to the stream
        const stream = Array.from(project.evaluator.nativeStreams.values())[0];
        expect(stream).not.toBeUndefined();
        stream?.add(value as unknown as any);

        // Verify that the source has the new value
        const actualNext = project.evaluator.getLatestSourceValue(source);
        expect(actualNext?.toString()).toBe(expectedNext);
        project.evaluator.stop();
    }
);
