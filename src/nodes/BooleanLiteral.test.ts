import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import Exception from '@runtime/Exception';
import { test, expect } from 'vitest';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();

test('Test equality', () => {
    expect(
        Evaluator.evaluateCode(
            native,
            `${TRUE_SYMBOL} = ${TRUE_SYMBOL}`
        )?.toString()
    ).toBe(TRUE_SYMBOL);
    expect(
        Evaluator.evaluateCode(
            native,
            `${FALSE_SYMBOL} = ${TRUE_SYMBOL}`
        )?.toString()
    ).toBe(FALSE_SYMBOL);
    expect(
        Evaluator.evaluateCode(
            native,
            `${FALSE_SYMBOL} = ${FALSE_SYMBOL}`
        )?.toString()
    ).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode(native, `${TRUE_SYMBOL} = 1`)).toBeInstanceOf(
        Exception
    );
});
