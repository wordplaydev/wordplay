import { test, expect } from 'vitest';
import Project from '../models/Project';
import Source from './Source';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Stream from '@runtime/Stream';
import type Value from '@runtime/Value';
import Time from '../streams/Time';
import NoneType from './NoneType';

test.each([
    // Check stream resolution.
    [
        `↓ time\ntime > 0ms`,
        'time',
        Time.make(NoneType.None, 1),
        FALSE_SYMBOL,
        TRUE_SYMBOL,
    ],
    // Check stream references.
    [
        `↓ time\ntime + 500ms`,
        'time',
        Time.make(NoneType.None, 1),
        '500ms',
        '501ms',
    ],
    // Check reaction binding.
    [
        `↓ time\na: 1 … time % 2\na`,
        'time',
        Time.make(NoneType.None, 1),
        '1',
        '1ms',
    ],
    // Check reaction change checks.
    [
        `↓ time\na: 1 … ∆ time ? 'yes' 'no'\na`,
        'time',
        Time.make(NoneType.None, 1),
        '1',
        '"yes"',
    ],
    // Check reactions in evaluations.
    [
        `
        ↓ time
        ƒ mult(a•# b•#) a · b
        b: mult(2 0ms … time)
        b
        `,
        'time',
        Time.make(NoneType.None, 1),
        '0ms',
        '2ms',
    ],
])(
    'React to %s',
    (
        code: string,
        streamName: string,
        value: Value,
        expectedInitial: string,
        expectedNext: string
    ) => {
        const source = new Source('test', code);
        const project = new Project('test', source, []);
        project.evaluate();
        const actualIinitial = project.evaluator.getLatestSourceValue(source);
        expect(actualIinitial?.toString()).toBe(expectedInitial);
        const stream = (project.streams as Record<string, Stream>)[streamName];
        expect(stream).not.toBeUndefined();
        stream?.add(value as unknown as any);
        const actualNext = project.evaluator.getLatestSourceValue(source);
        expect(actualNext?.toString()).toBe(expectedNext);
        project.evaluator.stop();
    }
);
