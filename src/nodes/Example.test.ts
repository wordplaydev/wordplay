import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import Example from '#nodes/Example.ts';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test('an unclosed Example says so', () => {
    testConflict(
        '¶see \\1 + 1\\ here¶\na: 1\na',
        '¶see \\1 + 1 here¶\na: 1\na',
        Example,
        UnclosedDelimiter,
    );
});
