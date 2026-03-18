import { testConflict } from '@conflicts/TestUtilities';
import { UnknownName } from '@conflicts/UnknownName';
import { expect, test } from 'vitest';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';
import ListAccess from './ListAccess';
import Reference from './Reference';

test.each([
    ['[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, IncompatibleInput, 0],
    ['[1][1]', '1[1]', ListAccess, IncompatibleInput, 0],
    // Verify that type guards are working on list accesses.
    [
        'list: [1 2 ø 3]\nlist[2]•ø ? 1 list[2] + 1',
        'list: [1 2 ø 3]\nlist[2]•# ? 1 list[2] + 1',
        Reference,
        UnknownName,
        2,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});

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
