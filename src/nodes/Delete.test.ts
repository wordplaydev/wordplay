import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import Delete from './Delete';
import IncompatibleInput from '../conflicts/IncompatibleInput';

test.each([
    [
        'table: ⎡one•#⎦\ntable⎡- 1 < 2',
        'table: 1\ntable ⎡- 1 < 2',
        Delete,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡- 1 < 2',
        'table: 1\ntable ⎡- 1 + 2',
        Delete,
        IncompatibleInput,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
