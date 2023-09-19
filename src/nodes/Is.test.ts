import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['1•#', '⊤'],
    ['1s•#', '⊤'],
    ['1s•#s', '⊤'],
    ['1s•#m', '⊥'],
    ["'hi'•#", '⊥'],
    ["'hi'•''", '⊤'],
    ['a: 1\na•#', '⊤'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
