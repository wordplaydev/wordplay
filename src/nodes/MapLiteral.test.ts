import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import { NotAKeyValue } from '@conflicts/NotAKeyValue';
import { testConflict } from '@conflicts/TestUtilities';
import { test } from 'vitest';
import MapLiteral from '@nodes/MapLiteral';

test.each([['{1:1 2:2 3:3}', '{1:1 2 3:3}', MapLiteral, NotAKeyValue]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['{1:2}', '{1:2', MapLiteral, UnclosedDelimiter, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
