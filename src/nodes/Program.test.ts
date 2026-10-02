import Evaluator from '#runtime/Evaluator.ts';
import NumberValue from '#values/NumberValue.ts';
import { expect, test } from 'vitest';
import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import type Value from '#values/Value.ts';
import Source from '#nodes/Source.ts';
import { must } from '#util/nullable.ts';

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
            new Source('test', must(code[0], 'the main source')),
            code
                .slice(1)
                .map((code, index) => new Source(`sup${index + 1}`, code)),
            DefaultLocale,
        );
        const value = new Evaluator(project, DB, [
            DefaultLocale,
        ]).getInitialValue();
        expect(value).toBeDefined();
        expect(value!.constructor).toBe(valueType);
    },
);
