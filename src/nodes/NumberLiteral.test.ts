import { testConflict } from '@conflicts/TestUtilities';
import { NotANumber } from '@conflicts/NotANumber';
import NumberLiteral from '@nodes/NumberLiteral';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['2;1', '2;9', NumberLiteral, NotANumber, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
