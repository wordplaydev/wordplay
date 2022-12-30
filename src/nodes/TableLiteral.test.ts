import { test } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import MissingCell from '../conflicts/MissingCell';
import ExpectedColumnType from '../conflicts/ExpectedColumnType';
import IncompatibleCellType from '../conflicts/IncompatibleCellType';
import TableLiteral from './TableLiteral';
import TableType from './TableType';

test('Test table conflicts', () => {
    testConflict('⎡a•# b•#⎦', '⎡a•# b⎦', TableType, ExpectedColumnType);
    testConflict(
        '⎡a•# b•#⎦\n⎡1 2⎦',
        '⎡a•# b•#⎦\n⎡1⎦',
        TableLiteral,
        MissingCell
    );
    testConflict(
        '⎡a•# b•#⎦\n⎡1 2⎦',
        '⎡a•# b•#⎦\n⎡"hi" "there"⎦',
        TableLiteral,
        IncompatibleCellType
    );
});
