import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['ø = ø', TRUE_SYMBOL],
    ['ø ≠ ø', FALSE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
