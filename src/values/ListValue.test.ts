import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['[] = []', TRUE_SYMBOL],
    ['[1] = [1]', TRUE_SYMBOL],
    ['[1] = [1 2]', FALSE_SYMBOL],
    ['[1 2] = [1]', FALSE_SYMBOL],
    ['[1 2] ≠ [1]', TRUE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
