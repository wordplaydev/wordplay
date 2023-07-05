import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import Delete from './Delete';
import IncompatibleInput from '../conflicts/IncompatibleInput';

test('Test delete conflicts', () => {
    testConflict(
        'table: ⎡one•#⎦\ntable⎡- 1 < 2',
        'table: 1\ntable ⎡- 1 < 2',
        Delete,
        IncompatibleInput
    );
    testConflict(
        'table: ⎡one•#⎦\ntable⎡- 1 < 2',
        'table: 1\ntable ⎡- 1 + 2',
        Delete,
        IncompatibleInput
    );
});
