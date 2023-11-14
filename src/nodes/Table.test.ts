import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Symbols';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ = ⎡a•# b•#⎦⎡1 2⎦', TRUE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ = ⎡a•# b•#⎦⎡1 3⎦', FALSE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ ≠ ⎡a•# b•#⎦⎡1 3⎦', TRUE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ = ø', FALSE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ ≠ ø', TRUE_SYMBOL],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
