import UnopenedDelimiter from '#conflicts/UnopenedDelimiter.ts';
import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import { CharacterWarning } from '#conflicts/CharacterWarning.ts';
import Translation from '#nodes/Translation.ts';
import { test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([["'hi'", "'@Phrase'", Translation, CharacterWarning, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test('an unclosed Translation says so', () => {
    testConflict(
        "a: 'hello'\na",
        "a: 'hello\na",
        Translation,
        UnclosedDelimiter,
    );
});

test('a Translation with no opening delimiter says so', () => {
    testConflict(
        "a: ['hello there']\na",
        "a: [hello there']\na",
        Translation,
        UnopenedDelimiter,
    );
});
