import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Database';

test('Test custom type conflicts', () => {
    expect(
        Evaluator.evaluateCode(DefaultLocale, `"hello"`)?.toWordplay([])
    ).toBe('"hello"');
    expect(
        Evaluator.evaluateCode(DefaultLocale, `"hello"/`)?.toWordplay([])
    ).toBe('"hello"');
    expect(
        Evaluator.evaluateCode(DefaultLocale, `"hello"/en`)?.toWordplay([])
    ).toBe('"hello"/en');
});
