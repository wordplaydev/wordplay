import { testConflict } from '@conflicts/TestUtilities';
import { test } from 'vitest';
import IncompatibleType from '../conflicts/IncompatibleType';
import Spread from './Spread';

test.each([['num: [1] [1 :num]', 'num: 2 [1 :num]', Spread, IncompatibleType]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);
