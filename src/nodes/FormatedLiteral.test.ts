import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import { DefaultLocales } from '../locale/DefaultLocale';

test.each([
    // Test JavaScript number translation.
    ['`hello`', 'hello'],
    ['`hello`/', 'hello'],
    ['`hello`/en', 'hello'],
    ['`hello\\1\\world`/en', 'hello1world'],
    ["`hello\\'no'\\world`/en", 'hellonoworld'],
])('%s -> %s', (code, value) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});
