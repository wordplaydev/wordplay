import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import Evaluator from '@runtime/Evaluator';
import ListAccess from './ListAccess';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import { DefaultLocale } from '../db/Database';

test.each([
    ['[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, IncompatibleInput],
    ['[1][1]', '1[1]', ListAccess, IncompatibleInput],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);

test.each([
    ['[1 2 3][2]', '2'],
    ['[1 2 3][0]', 'ø'],
    ['[1 2 3][-1]', '3'],
    ['[1 2 3][-3]', '1'],
    ['[1 2 3][-4]', 'ø'],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});
