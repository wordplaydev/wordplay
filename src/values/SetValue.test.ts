import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Creator';

test.each([
    ['{} = {}', TRUE_SYMBOL],
    ['{1} = {1}', TRUE_SYMBOL],
    ['{1} = {1 2}', FALSE_SYMBOL],
    ['{1 2} = {1}', FALSE_SYMBOL],
    ['{1 2} ≠ {1}', TRUE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});