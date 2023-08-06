import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import { test, expect } from 'vitest';
import { DefaultLocale } from '../db/Database';

test('Test equality', () => {
    expect(
        Evaluator.evaluateCode(
            DefaultLocale,
            `${TRUE_SYMBOL} = ${TRUE_SYMBOL}`
        )?.toString()
    ).toBe(TRUE_SYMBOL);
    expect(
        Evaluator.evaluateCode(
            DefaultLocale,
            `${FALSE_SYMBOL} = ${TRUE_SYMBOL}`
        )?.toString()
    ).toBe(FALSE_SYMBOL);
    expect(
        Evaluator.evaluateCode(
            DefaultLocale,
            `${FALSE_SYMBOL} = ${FALSE_SYMBOL}`
        )?.toString()
    ).toBe(TRUE_SYMBOL);
    expect(
        Evaluator.evaluateCode(DefaultLocale, `${TRUE_SYMBOL} = 1`)
    ).toBeInstanceOf(ExceptionValue);
});
