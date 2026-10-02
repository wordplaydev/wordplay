import { FALSE_SYMBOL, TRUE_SYMBOL } from '#parser/Symbols.ts';
import { expect, test } from 'vitest';
import evaluateCode from '#runtime/evaluate.ts';

test.each([
    ['ø = ø', TRUE_SYMBOL],
    ['ø ≠ ø', FALSE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
