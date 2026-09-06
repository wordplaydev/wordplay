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
    // A literal type asks about the value, not its generalized type. A value's own type is
    // never literal (`5` reports `#`), so comparing types made every one of these ⊥ — see
    // NumberType.acceptsValue. Numbers compare by value, so `5.0` and `一` match too.
    ['5•5', '⊤'],
    ['5•4', '⊥'],
    ['5.0•5', '⊤'],
    ['1•一', '⊤'],
    ['5s•5s', '⊤'],
    ['5•5s', '⊥'],
    ['5s•5', '⊥'],
    ["'hi'•'hi'", '⊤'],
    ["'hi'•'bye'", '⊥'],
    ['a: 5\na•5', '⊤'],
    // A union of literals accepts the value one of its arms names.
    ['5•1|5', '⊤'],
    ['5•1|2', '⊥'],
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
