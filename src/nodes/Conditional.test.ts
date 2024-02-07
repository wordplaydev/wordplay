import { testConflict } from '@conflicts/TestUtilities';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import Conditional from './Conditional';
import BinaryEvaluate from './BinaryEvaluate';
import { test, expect } from 'vitest';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import type Node from './Node';
import type Conflict from '../conflicts/Conflict';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['⊥ ? 2 3"', '1 ? 2 3', Conditional, ExpectedBooleanCondition],
    [
        `
        a: 1 > 0 ? 1 "hi"
        a•# ? a + 1 a
        `,
        `
        a: 1 > 0 ? 1 "hi"
        ⊤ ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
        1,
    ],
    [
        `
        a: 1 > 0 ? 1 "hi"
        ((a•#) & (a > 1)) ? a + 1 a
        `,
        `
        a: 1 > 0 ? 1 "hi"
        ~((a•#) & (a > 1)) ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
        3,
    ],
    [
        `
        •Cat(name•""|#)
        a: Cat(1)
        a.name•# ? a.name + 1 a
        `,
        `
        •Cat(name•""|#)
        a: Cat(1)
        a.name•"" ? a.name + 'hi' a
        `,
        BinaryEvaluate,
        IncompatibleInput,
        0,
    ],
    [
        `
        a•#|"": 1
        a•# ? a + 1 a
        `,
        `
        a•#|"": 1
        ~(a•#) ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
    ],
    [
        `
        a•#|"": 1
        a•# ? a + 1 a`,
        `
        a•#|"": 1
        ~~(a•#) ? a a + 1
        `,
        BinaryEvaluate,
        IncompatibleInput,
    ],
])(
    '%s => no conflict, %s => conflict',
    (
        good: string,
        bad: string,
        node: new (...params: never[]) => Node,
        conflict: new (...params: never[]) => Conflict,
        number?: number,
    ) => {
        testConflict(good, bad, node, conflict, number);
    },
);

test('Test conditional logic', () => {
    expect(evaluateCode("1 < 5 ? 'yes' 'no'")?.toString()).toBe('"yes"');
    expect(evaluateCode("1 > 5 ? 'yes' 'no'")?.toString()).toBe('"no"');
    expect(evaluateCode("1 > 5 ? 'yes' 1 > 0 ? 'maybe' 'no'")?.toString()).toBe(
        '"maybe"',
    );
});
