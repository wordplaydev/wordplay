import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Database';

test.each([
    // Test JavaScript number translation.
    ['`hello`', 'hello'],
    ['`hello`/', 'hello'],
    ['`hello`/en', 'hello'],
    ['`hello\\1\\world`/en', 'hello1world'],
    ["`hello\\'no'\\world`/en", 'hellonoworld'],
])('%s -> %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toWordplay([])).toBe(
        value
    );
});
