import MissingInput from '@conflicts/MissingInput';
import { testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Source from '@nodes/Source';
import UnaryEvaluate from '@nodes/UnaryEvaluate';

test.each([
    ['~(1 > 1)', '~"hi"', UnaryEvaluate, IncompatibleInput],
    ['-(1)', '-"hi"', UnaryEvaluate, IncompatibleInput],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});

test('a prefix operator needs a space after a binary one', () => {
    // `nextIsUnary` is purely lexical: an operator bound tightly to what follows is
    // read as a prefix. So a right operand that is itself a prefix has to be
    // separated, or the binary operator becomes the prefix and the left operand
    // becomes its own statement. Any edit that inserts a prefix operator has to
    // preserve this.
    const spaced = new Source('test', '⊤ & ~⊥');
    expect(
        spaced.nodes().find((node) => node instanceof BinaryEvaluate)?.right,
    ).toBeInstanceOf(UnaryEvaluate);

    const tight = new Source('test', '⊤ &~⊥');
    expect(
        tight.nodes().find((node) => node instanceof BinaryEvaluate),
    ).toBeUndefined();
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([
    [
        '•T() (ƒ -() 1)\n-T()',
        '•T() (ƒ -(a•#) 1)\n-T()',
        UnaryEvaluate,
        MissingInput,
        0,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});
