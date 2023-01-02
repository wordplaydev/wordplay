import { testConflict } from '../conflicts/TestUtilities';
import { ExpectedEndingExpression } from '../conflicts/ExpectedEndingExpression';
import { IgnoredExpression } from '../conflicts/IgnoredExpression';
import DuplicateLanguages from '../conflicts/DuplicateLanguages';
import Evaluator from '../runtime/Evaluator';
import Block from './Block';
import { test, expect } from 'vitest';
import Docs from './Docs';
import Evaluate from './Evaluate';
import NotAFunction from '../conflicts/NotAFunction';

test.each([
    ['(1)', '()', Block, ExpectedEndingExpression],
    [
        '`hi`/eng`hola`/spa\n"hi"',
        '`hi`/eng`hola`/eng\n"hi"',
        Docs,
        DuplicateLanguages,
    ],
    ['1 + 1', '1 + 1\n2 + 2', Block, IgnoredExpression],
    ['ƒ b() 1\nb()', "(ƒ b() 1)\nb()'", Evaluate, NotAFunction],
    ['•B()\nB()', "a: (•B())\nB()'", Evaluate, NotAFunction],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    }
);

test.each([['b: (a: 5\na)\nb', '5']])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(code)?.toString()).toBe(value);
});
