import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import InvalidRow from '@conflicts/InvalidRow';
import MissingCell from '@conflicts/MissingCell';
import { testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import DefaultLocales from '../locale/DefaultLocales';
import evaluateCode from '../runtime/evaluate';
import Insert from './Insert';

test.each([
    [
        'table: ⎡one•#⎦\ntable ⎡+ 1⎦',
        'table: 1\ntable ⎡+ 1⎦',
        Insert,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡+ 1⎦',
        'table: ⎡one•#⎦\ntable ⎡+⎦',
        Insert,
        MissingCell,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡+ 1⎦',
        'table: ⎡one•#⎦\ntable⎡+ "hi"⎦',
        Insert,
        IncompatibleCellType,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡+ 1 1⎦',
        'table: ⎡one•#⎦\ntable⎡+ 1 one:1⎦',
        Insert,
        InvalidRow,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡+ 2 3⎦', '⎡ 1 2 ⎦\n⎡ 2 3 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡+ 2 3⎦ ⎡+ 3 4⎦', '⎡ 1 2 ⎦\n⎡ 2 3 ⎦\n⎡ 3 4 ⎦'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});
