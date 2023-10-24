import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import IncompatibleType from '../conflicts/IncompatibleType';
import Spread from './Spread';

test.each([['num: [1] [1 :num]', 'num: 2 [1 :num]', Spread, IncompatibleType]])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
