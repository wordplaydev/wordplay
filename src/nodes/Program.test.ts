import { expect, test } from 'vitest';
import { getDefaultNative } from '../native/Native';
import Evaluator from '../runtime/Evaluator';
import Number from '../runtime/Number';
import Source from './Source';
import Project from '../models/Project';
import type Value from '../runtime/Value';

const native = await getDefaultNative();

test.each([
    // A single source with 1 should evaluate to 1
    [[`1`], Number],
    // Two sources, one supplement blank, should evaluate to 1
    [[`1`, ``], Number],
])('Expect program value', (code: string[], valueType: Function) => {
    const project = new Project(
        null,
        'test',
        new Source('test', code[0]),
        code.slice(1).map((code, index) => new Source(`sup${index + 1}`, code)),
        native
    );
    const value = new Evaluator(project).getInitialValue();
    expect(value).toBeDefined();
    expect((value as Value).constructor).toBe(valueType);
});
