import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import type Conflict from '@conflicts/Conflict';
import { testConflict } from '@conflicts/TestUtilities';
import IncompatibleType from '@conflicts/IncompatibleType';
import type Node from './Node';
import Match from './Match';

test.each([
    [
        '"one" ??? "one": 1 "two": 2 3',
        '1 ??? 1: 1 "two": 2 3',
        Match,
        IncompatibleType,
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

test('Test match expressions', () => {
    expect(evaluateCode("1 ??? 1: 'one' 2: 'two' 'other'")?.toString()).toBe(
        '"one"',
    );
    expect(evaluateCode("2 ??? 1: 'one' 2: 'two' 'other'")?.toString()).toBe(
        '"two"',
    );
    expect(evaluateCode("3 ??? 1: 'one' 2: 'two' 'other'")?.toString()).toBe(
        '"other"',
    );
    expect(
        evaluateCode(
            "'hi' ??? 'hi': 'hello' 'bye': 'goodbye' 'ummm'",
        )?.toString(),
    ).toBe('"hello"');
    expect(
        evaluateCode(
            "'yo' ??? 'hi': 'hello' 'bye': 'goodbye' 'ummm'",
        )?.toString(),
    ).toBe('"ummm"');
});
