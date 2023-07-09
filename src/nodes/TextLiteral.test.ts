import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();

test('Test custom type conflicts', () => {
    expect(Evaluator.evaluateCode(native, `"hello"`)?.toWordplay([])).toBe(
        '"hello"'
    );
    expect(Evaluator.evaluateCode(native, `"hello"/`)?.toWordplay([])).toBe(
        '"hello"'
    );
    expect(Evaluator.evaluateCode(native, `"hello"/en`)?.toWordplay([])).toBe(
        '"hello"/en'
    );
});
