import ExpectedColumnBind from '@conflicts/ExpectedColumnBind';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownColumn from '@conflicts/UnknownColumn';
import { expect, test } from 'vitest';
import DefaultLocales from '@locale/DefaultLocales';
import evaluateCode from '@runtime/evaluate';
import Update from '@nodes/Update';

test.each([
    // Number assigned to a text column — IncompatibleCellType. (Previously this
    // test caught the cascading "query isn't boolean" IncompatibleInput from
    // `one < 1` on a text column; that cascade is now suppressed by the type-
    // rooted gates in #1146, and the proper cell-type conflict is what fires.)
    [
        'table: ⎡one•#⎦\ntable ⎡: one: 1 ⎦ one < 1',
        'table: ⎡one•""⎦\ntable ⎡: one: 1 ⎦ one < 1',
        Update,
        IncompatibleCellType,
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
])('%s => no conflict, %s => conflict', (good, bad, kind, conflict) => {
    testConflict(good, bad, kind, conflict);
});

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡: a: 2 ⎦ ⊤', '⎡ 2 2 ⎦\n⎡ 2 4 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡: a: 2 ⎦ a < 2', '⎡ 2 2 ⎦\n⎡ 3 4 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡: a: 2 b: b + 1 ⎦ a < 2', '⎡ 2 3 ⎦\n⎡ 3 4 ⎦'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});
