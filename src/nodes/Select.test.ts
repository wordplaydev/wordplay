import { test } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import UnknownColumn from '../conflicts/UnknownColumn';
import ExpectedSelectName from '../conflicts/ExpectedSelectName';
import NonBooleanQuery from '../conflicts/NonBooleanQuery';
import NotATable from '../conflicts/NotATable';
import Select from './Select';

test.each([
    [
        'table: ⎡one•#⎦\ntable ⎡? ⎡one⎦ 1 < 2',
        'table: 1\ntable ⎡? ⎡one⎦ 1 < 2',
        Select,
        NotATable,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡? ⎡one⎦ 1 < 2',
        'table: 1\ntable ⎡? ⎡one⎦ 1 + 2',
        Select,
        NonBooleanQuery,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡? ⎡one⎦ 1 < 2',
        'table: ⎡one•#⎦\ntable ⎡? ⎡two⎦ 1 < 2',
        Select,
        UnknownColumn,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡? ⎡one⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡? ⎡1⎦ one < 1',
        Select,
        ExpectedSelectName,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
