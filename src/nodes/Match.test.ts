import type Conflict from '@conflicts/Conflict';
import IncompatibleType from '@conflicts/IncompatibleType';
import { testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import Match from '@nodes/Match';
import type Node from '@nodes/Node';
import ListValue from '@values/ListValue';

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

test.each([
    ['no case matches', "m: 5 ??? 3: 'a' 'c'"],
    ['the only case matches', "m: 5 ??? 5: 'a' 'c'"],
    ['the first of two matches', "m: 5 ??? 5: 'a' 4: 'b' 'c'"],
    ['the second of two matches', "m: 5 ??? 3: 'a' 5: 'b' 'c'"],
    ['neither of two matches', "m: 5 ??? 3: 'a' 4: 'b' 'c'"],
    ['the last of three matches', "m: 5 ??? 1: 'a' 2: 'b' 5: 'c' 'd'"],
])('a match leaves nothing on the stack when %s', (_, statement) => {
    // A match peeks at its subject once per case rather than popping it, so
    // whoever finishes the match has to take it off. When it didn't, the value
    // stayed on the evaluation's stack and every later pop was off by one:
    // Block.collect pops one value per statement, so the ƒ before this bind
    // received the match's leftover subject instead of its own function. The
    // match's own value was right either way, which is what made it invisible.
    // Asserting the value here would pass with the bug; asserting the ƒ's is
    // what catches it.
    const value = evaluateCode(`ƒ f() 1\n${statement}\nPhrase('x')`);
    const first = value instanceof ListValue ? value.values[0] : undefined;
    expect([statement, first?.creator.constructor.name]).toEqual([
        statement,
        'FunctionDefinition',
    ]);
});
