import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Symbols';
import Evaluator from '../runtime/Evaluator';
import { DefaultLocale } from '../db/Creator';

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ = ⎡a•# b•#⎦⎡1 2⎦', TRUE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ = ⎡a•# b•#⎦⎡1 3⎦', FALSE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ ≠ ⎡a•# b•#⎦⎡1 3⎦', TRUE_SYMBOL],
])('%s = %s', (code: string, value: string) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});
