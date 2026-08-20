import { ImpossibleType } from '@conflicts/ImpossibleType';
import Otherwise from '@nodes/Otherwise';
import { testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

test.each([
    ['1 ?? 2', '1'],
    ['ø ?? 2', '2'],
])('%s should evaluate to %s', (code: string, result: string) => {
    expect(evaluateCode(code)?.toString()).toBe(result);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['(1 ÷ 0) ?? 2', '1 ?? 2', Otherwise, ImpossibleType, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
