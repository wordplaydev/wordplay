import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test.each([
    // Test JavaScript number translation.
    [`"hello"`, '"hello"'],
    [`"hello"/`, '"hello"'],
    [`"hello"/en`, '"hello"/en'],
    [`"hello\\1\\world"/en`, '"hello1world"/en'],
    [`"hello\\'no'\\world"/en`, '"hellonoworld"/en'],
])('%s -> %s', (code, value) => {
    expect(evaluateCode(code)?.toWordplay([])).toBe(value);
});
