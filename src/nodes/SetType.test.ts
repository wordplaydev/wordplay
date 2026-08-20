import { testConflict } from '@conflicts/TestUtilities';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import SetType from '@nodes/SetType';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['a•{#}: {1}\na', 'a•{#\na: {1}', SetType, UnclosedDelimiter, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
