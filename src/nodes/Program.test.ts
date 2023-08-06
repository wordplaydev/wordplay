import { expect, test } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import NumberValue from '@values/NumberValue';
import Source from './Source';
import Project from '../models/Project';
import type Value from '../values/Value';
import { DefaultLocale } from '../db/Database';

test.each([
    // A single source with 1 should evaluate to 1
    [[`1`], NumberValue],
    // Two sources, one supplement blank, should evaluate to 1
    [[`1`, ``], NumberValue],
])('Expect program value', (code: string[], valueType: Function) => {
    const project = new Project(
        null,
        'test',
        new Source('test', code[0]),
        code.slice(1).map((code, index) => new Source(`sup${index + 1}`, code)),
        DefaultLocale
    );
    const value = new Evaluator(project).getInitialValue();
    expect(value).toBeDefined();
    expect((value as Value).constructor).toBe(valueType);
});
