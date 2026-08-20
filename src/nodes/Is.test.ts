import { ImpossibleType } from '@conflicts/ImpossibleType';
import Is from '@nodes/Is';
import { testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

test.each([
    ['1•#', '⊤'],
    ['1s•#', '⊤'],
    ['1s•#s', '⊤'],
    ['1s•#m', '⊥'],
    ["'hi'•#", '⊥'],
    ["'hi'•''", '⊤'],
    ['a: 1\na•#', '⊤'],
    // A list type with a type per position checks the items themselves, since a list value's own
    // type unions its items and so can't say what's at each position.
    ["[1 'hi']•[# '']", '⊤'],
    ["['hi' 1]•[# '']", '⊥'],
    ["[1 'hi']•[#|'']", '⊤'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['1•#', "1•''", Is, ImpossibleType, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
