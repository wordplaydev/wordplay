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
