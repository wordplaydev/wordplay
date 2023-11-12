import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['1 ?? 2', '1'],
    ['ø ?? 2', '2'],
])('%s should evaluate to %s', (code: string, result: string) => {
    expect(evaluateCode(code)?.toString()).toBe(result);
});
