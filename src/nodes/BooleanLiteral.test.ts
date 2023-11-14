import { FALSE_SYMBOL, NONE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test('Test equality', () => {
    expect(evaluateCode(`${TRUE_SYMBOL} = ${TRUE_SYMBOL}`)?.toString()).toBe(
        TRUE_SYMBOL
    );
    expect(evaluateCode(`${FALSE_SYMBOL} = ${TRUE_SYMBOL}`)?.toString()).toBe(
        FALSE_SYMBOL
    );
    expect(evaluateCode(`${FALSE_SYMBOL} = ${FALSE_SYMBOL}`)?.toString()).toBe(
        TRUE_SYMBOL
    );
    expect(evaluateCode(`${FALSE_SYMBOL} = ${NONE_SYMBOL}`)?.toString()).toBe(
        FALSE_SYMBOL
    );
    expect(evaluateCode(`${FALSE_SYMBOL} ≠ ${NONE_SYMBOL}`)?.toString()).toBe(
        TRUE_SYMBOL
    );
});
