import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownColumn from '@conflicts/UnknownColumn';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedUpdateBind from '@conflicts/ExpectedUpdateBind';
import Update from './Update';
import IncompatibleInput from '../conflicts/IncompatibleInput';

test('Test select conflicts', () => {
    testConflict(
        'table: ⎡one•#⎦\ntable⎡: ⎡one:1⎦ one < 1',
        'table: 1\ntable ⎡: ⎡one:1⎦ one < 1',
        Update,
        IncompatibleInput
    );
    testConflict(
        'table: ⎡one•#⎦\ntable⎡: ⎡one:1⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: ⎡one⎦ one < 1',
        Update,
        ExpectedUpdateBind
    );
    testConflict(
        'table: ⎡one•#⎦\ntable⎡: ⎡one:1⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: ⎡two:1⎦ one < 1',
        Update,
        UnknownColumn
    );
    testConflict(
        'table: ⎡one•#⎦\ntable⎡: ⎡one:1⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡: ⎡one:""⎦ one < 1',
        Update,
        IncompatibleCellType
    );
});
