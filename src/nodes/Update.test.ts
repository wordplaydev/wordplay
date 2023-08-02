import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownColumn from '@conflicts/UnknownColumn';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedUpdateBind from '@conflicts/ExpectedUpdateBind';
import Update from './Update';
import IncompatibleInput from '../conflicts/IncompatibleInput';

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
        ExpectedUpdateBind,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡: one: 1 ⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: one ⎦ one < 1',
        Update,
        ExpectedUpdateBind,
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
