import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();

test.each([
    ['1•#', '⊤'],
    ['1s•#', '⊥'],
    ['1s•#s', '⊤'],
    ['1s•#m', '⊥'],
    ["'hi'•#", '⊥'],
    ["'hi'•''", '⊤'],
    ['a: 1\na•#', '⊤'],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(native, code)?.toString()).toBe(value);
});
