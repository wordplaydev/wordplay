import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import Delete from './Delete';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';
import { DefaultLocales } from '../locale/DefaultLocale';

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
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);

test.each([['⎡a•# b•#⎦⎡1 2⎦⎡1 3⎦ ⎡- b = 3', '⎡ 1 2 ⎦']])(
    '%s = %s',
    (code: string, value: string) => {
        expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
    }
);
