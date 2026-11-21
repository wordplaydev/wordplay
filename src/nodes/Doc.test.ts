import UnopenedDelimiter from '#conflicts/UnopenedDelimiter.ts';
import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import Doc from '#nodes/Doc.ts';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test('an unclosed Doc says so', () => {
    testConflict('¶hello¶\na: 1\na', '¶hello\na: 1\na', Doc, UnclosedDelimiter);
});

test('a Doc with no opening delimiter says so', () => {
    testConflict(
        '¶hello there¶\na: 1\na',
        'hello there¶\na: 1\na',
        Doc,
        UnopenedDelimiter,
    );
});
