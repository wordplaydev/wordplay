import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import FormattedTranslation from '#nodes/FormattedTranslation.ts';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test('an unclosed FormattedTranslation says so', () => {
    testConflict(
        'a: `hello`\na',
        'a: `hello\na',
        FormattedTranslation,
        UnclosedDelimiter,
    );
});
