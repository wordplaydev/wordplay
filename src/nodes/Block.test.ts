import { testConflict } from '@conflicts/TestUtilities';
import { ExpectedEndingExpression } from '@conflicts/ExpectedEndingExpression';
import { IgnoredExpression } from '@conflicts/IgnoredExpression';
import Block from './Block';
import { test, expect } from 'vitest';
import Evaluate from './Evaluate';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['(1)', '()', Block, ExpectedEndingExpression],
    ['1 + 1', '1 + 1\n2 + 2', Block, IgnoredExpression],
    ['ƒ b() 1\nb()', "(ƒ b() 1)\nb()'", Evaluate, IncompatibleInput],
    ['•B()\nB()', "a: (•B())\nB()'", Evaluate, IncompatibleInput],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    }
);

test.each([
    // Ensure blocks evaluate to values
    ['b: (a: 5\na)\nb', '5'],
    // Ensure names don't leak out of scope
    ['(count: 10 count ^ count) + count', '!NameException'],
    // Ensure that block clsures work
    ['fun: (x: 2 ƒ() x) fun()', '2'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
