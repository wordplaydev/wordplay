import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { getDefaultBasis } from '../basis/Basis';

const basis = getDefaultBasis();

test('Test custom type conflicts', () => {
    expect(Evaluator.evaluateCode(basis, `"hello"`)?.toWordplay([])).toBe(
        '"hello"'
    );
    expect(Evaluator.evaluateCode(basis, `"hello"/`)?.toWordplay([])).toBe(
        '"hello"'
    );
    expect(Evaluator.evaluateCode(basis, `"hello"/en`)?.toWordplay([])).toBe(
        '"hello"/en'
    );
});
