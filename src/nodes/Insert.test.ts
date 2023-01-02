import { test } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import IncompatibleCellType from '../conflicts/IncompatibleCellType';
import NotATable from '../conflicts/NotATable';
import Insert from './Insert';
import MissingCell from '../conflicts/MissingCell';
import InvalidRow from '../conflicts/InvalidRow';

test.each([
    ['table: ⎡one•#⎦\ntable⎡+ ⎡1⎦', 'table: 1\ntable⎡+ ⎡1⎦', Insert, NotATable],
    [
        'table: ⎡one•#⎦\ntable⎡+ ⎡1⎦',
        'table: ⎡one•#⎦\ntable⎡+ ⎡⎦',
        Insert,
        MissingCell,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡+ ⎡1⎦',
        'table: ⎡one•#⎦\ntable⎡+ ⎡"hi"⎦',
        Insert,
        IncompatibleCellType,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡+ ⎡1 1⎦',
        'table: ⎡one•#⎦\ntable⎡+ ⎡1 one:1⎦',
        Insert,
        InvalidRow,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
