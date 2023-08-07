import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Database';

test.each([
    ['ø = ø', TRUE_SYMBOL],
    ['ø ≠ ø', FALSE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});

test('Test equality', () => {});
