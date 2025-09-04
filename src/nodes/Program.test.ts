import Evaluator from '@runtime/Evaluator';
import NumberValue from '@values/NumberValue';
import { expect, test } from 'vitest';
import { DB } from '../db/Database';
import Project from '../db/projects/Project';
import DefaultLocale from '../locale/DefaultLocale';
import type Value from '../values/Value';
import Source from './Source';

test.each([
    // A single source with 1 should evaluate to 1
    [[`1`], NumberValue],
    // Two sources, one supplement blank, should evaluate to 1
    [[`1`, ``], NumberValue],
])(
    'Expect program value',
    (code: string[], valueType: new (...params: never[]) => Value) => {
        const project = Project.make(
            null,
            'test',
            new Source('test', code[0]),
            code
                .slice(1)
                .map((code, index) => new Source(`sup${index + 1}`, code)),
            DefaultLocale,
        );
        const value = new Evaluator(project, DB, [
            DefaultLocale,
        ]).getInitialValue();
        expect(value).toBeDefined();
        expect((value as Value).constructor).toBe(valueType);
    },
);
