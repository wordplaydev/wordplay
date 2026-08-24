import { testConflict } from '@conflicts/TestUtilities';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import Previous from '@nodes/Previous';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['← 1 Time(1000ms)', '← 1 2', Previous, IncompatibleInput, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
