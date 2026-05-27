import ExpectedColumnType from '@conflicts/ExpectedColumnType';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import MissingCell from '@conflicts/MissingCell';
import { testConflict } from '@conflicts/TestUtilities';
import { test } from 'vitest';
import TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';

test.each([
    ['⎡a•# b•#⎦', '⎡a•# b⎦', TableType, ExpectedColumnType],
    ['⎡a•# b•#⎦⎡1 2⎦', '⎡a•# b•#⎦⎡1⎦', TableLiteral, MissingCell],
    [
        '⎡a•# b•#⎦\n⎡1 2⎦',
        '⎡a•# b•#⎦\n⎡"hi" "there"⎦',
        TableLiteral,
        IncompatibleCellType,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});
