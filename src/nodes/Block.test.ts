import { ExpectedEndingExpression } from '@conflicts/ExpectedEndingExpression';
import { testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import { UnknownName } from '@conflicts/UnknownName';
import evaluateCode from '@runtime/evaluate';
import Block from '@nodes/Block';
import Reference from '@nodes/Reference';

test.each([
    ['(1)', '()', Block, ExpectedEndingExpression],
    // Calling a binding that lives in an inner block from outside its scope.
    // Reported as UnknownName on the Reference rather than a downstream
    // IncompatibleInput on the Evaluate — root-cause conflict only (#1146).
    ['ƒ b() 1\nb()', "(ƒ b() 1)\nb()'", Reference, UnknownName],
    ['•B()\nB()', "a: (•B())\nB()'", Reference, UnknownName],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    },
);

test.each([
    // Single non-Bind expression: block evaluates to that value.
    ['b: (a: 5\na)\nb', '5'],
    // Multiple non-Bind expressions: block evaluates to a list of them in source order.
    ['(1 + 1\n2 + 2)', '[2 4]'],
    // Binds are side effects, not values; they don't appear in the result list.
    ['(a: 10\nb: 20\na\nb)', '[10 20]'],
    // Ensure names don't leak out of scope
    ['(count: 10 count ^ count) + count', '!NameException'],
    // Ensure that block closures work
    ['fun: (x: 2 ƒ() x) fun()', '2'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
