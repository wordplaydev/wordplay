import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import ListAccess from './ListAccess';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';
import BinaryEvaluate from './BinaryEvaluate';

test.each([
    ['[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, IncompatibleInput],
    ['[1][1]', '1[1]', ListAccess, IncompatibleInput],
    // Verify that type guards are working on list accesses.
    [
        'list: [1 2 ø 3]\nlist[2]•ø ? 1 list[2] + 1',
        'list: [1 2 ø 3]\nlist[2]•# ? 1 list[2] + 1',
        BinaryEvaluate,
        IncompatibleInput,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

test.each([
    ['[1 2 3][2]', '2'],
    ['[1 2 3][5]', '2'],
    ['[1 2 3][0]', 'ø'],
    ['[1 2 3][-1]', '3'],
    ['[1 2 3][-3]', '1'],
    ['[1 2 3][-4]', '3'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
