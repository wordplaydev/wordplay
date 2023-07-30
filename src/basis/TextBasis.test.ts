import Evaluator from '@runtime/Evaluator';
import { test, expect } from 'vitest';
import { getDefaultBasis } from './Basis';

const basis = getDefaultBasis();

test('Test text functions', () => {
    expect(Evaluator.evaluateCode(basis, '"hello".length()')?.toString()).toBe(
        '5'
    );
});
