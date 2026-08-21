import { testConflict } from '@conflicts/TestUtilities';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import Changed from '@nodes/Changed';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['∆ Time(1000ms)', '∆ 1', Changed, IncompatibleInput, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
