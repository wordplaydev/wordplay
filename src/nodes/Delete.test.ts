import { testConflict } from '#conflicts/TestUtilities.ts';
import { expect, test } from 'vitest';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import evaluateCode from '#runtime/evaluate.ts';
import Delete from '#nodes/Delete.ts';

test.each([
    [
        'table: ⎡one•#⎦\ntable⎡- 1 < 2',
        'table: 1\ntable ⎡- 1 < 2',
        Delete,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡- 1 < 2',
        'table: 1\ntable ⎡- 1 + 2',
        Delete,
        IncompatibleInput,
    ],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

test.each([['⎡a•# b•#⎦⎡1 2⎦⎡1 3⎦ ⎡- b = 3', '⎡ 1 2 ⎦']])(
    '%s = %s',
    (code: string, value: string) => {
        expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
    },
);
