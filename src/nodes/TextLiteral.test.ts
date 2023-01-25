import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';

test('Test custom type conflicts', () => {
    expect(Evaluator.evaluateCode(`"hello"`)?.toWordplay([])).toBe('"hello"');
    expect(Evaluator.evaluateCode(`"hello"/`)?.toWordplay([])).toBe('"hello"');
    expect(Evaluator.evaluateCode(`"hello"/en`)?.toWordplay([])).toBe(
        '"hello"/en'
    );
});
