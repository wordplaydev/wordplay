import Evaluator from '@runtime/Evaluator';
import { test, expect } from 'vitest';
import { getDefaultNative } from './Native';

const native = await getDefaultNative();

test('Test text functions', () => {
    expect(Evaluator.evaluateCode(native, '"hello".length()')?.toString()).toBe(
        '5'
    );
});
