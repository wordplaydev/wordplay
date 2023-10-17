import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownColumn from '@conflicts/UnknownColumn';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedColumnBind from '@conflicts/ExpectedColumnBind';
import Update from './Update';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';
import { DefaultLocales } from '../locale/DefaultLocale';

test.each([
    [
        'table: ⎡one•#⎦\ntable ⎡: one: 1 ⎦ one < 1',
        'table: ⎡one•""⎦\ntable ⎡: one: 1 ⎦ one < 1',
        Update,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡: one: 1 ⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: one ⎦ one < 1',
        Update,
        ExpectedColumnBind,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡: one: 1 ⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: one ⎦ one < 1',
        Update,
        ExpectedColumnBind,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡: one:1 ⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: two:1 ⎦ one < 1',
        Update,
        UnknownColumn,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡: one: 1 ⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: one: "" ⎦ one < 1',
        Update,
        IncompatibleCellType,
    ],
])('good: %s bad: %s', (good, bad, kind, conflict) => {
    testConflict(good, bad, kind, conflict);
});

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡: a: 2 ⎦ ⊤', '⎡ 2 2 ⎦\n⎡ 2 4 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡: a: 2 ⎦ a < 2', '⎡ 2 2 ⎦\n⎡ 3 4 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡: a: 2 b: b + 1 ⎦ a < 2', '⎡ 2 3 ⎦\n⎡ 3 4 ⎦'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});
