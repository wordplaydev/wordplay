import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import MissingCell from '@conflicts/MissingCell';
import ExpectedColumnType from '@conflicts/ExpectedColumnType';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import TableLiteral from './TableLiteral';
import TableType from './TableType';

test.each([
    ['⎡a•# b•#⎦', '⎡a•# b⎦', TableType, ExpectedColumnType],
    ['⎡a•# b•#⎦\n⎡1 2⎦', '⎡a•# b•#⎦\n⎡1⎦', TableLiteral, MissingCell],
    [
        '⎡a•# b•#⎦\n⎡1 2⎦',
        '⎡a•# b•#⎦\n⎡"hi" "there"⎦',
        TableLiteral,
        IncompatibleCellType,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
