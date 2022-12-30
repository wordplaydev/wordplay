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

test('Test block conflicts', () => {
    testConflict('(1)', '()', Block, ExpectedEndingExpression);
    testConflict(
        '`hi`/eng`hola`/spa\n"hi"',
        '`hi`/eng`hola`/eng\n"hi"',
        Docs,
        DuplicateLanguages
    );
    testConflict('1 + 1', '1 + 1\n2 + 2', Block, IgnoredExpression);
    testConflict('ƒ b() 1\nb()', "(ƒ b() 1)\nb()'", Evaluate, NotAFunction);
    testConflict('•B()\nB()', "a: (•B())\nB()'", Evaluate, NotAFunction);
});

test('Test block evaluation', () => {
    expect(Evaluator.evaluateCode('b: (a: 5\na)\nb')?.toString()).toBe('5');
});
