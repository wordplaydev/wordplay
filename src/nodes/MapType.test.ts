import { testConflict } from '#conflicts/TestUtilities.ts';
import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import MapType from '#nodes/MapType.ts';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([
    ['a•{#:#}: {1:2}\na', 'a•{#:#\na: {1:2}', MapType, UnclosedDelimiter, 0],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});
