import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import ListLiteral from '@nodes/ListLiteral';
import { testConflict } from '@conflicts/TestUtilities';
import { test } from 'vitest';
import IncompatibleType from '@conflicts/IncompatibleType';
import Spread from '@nodes/Spread';

test.each([['num: [1] [1 :num]', 'num: 2 [1 :num]', Spread, IncompatibleType]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['[1 2]', '[1 2', ListLiteral, UnclosedDelimiter, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
