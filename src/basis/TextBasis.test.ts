import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test('Test text functions', () => {
    expect(evaluateCode('"hello".length()')?.toString()).toBe('5');
});
