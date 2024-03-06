import { test, expect } from 'vitest';
import Physics from './Physics';
import type Evaluator from '@runtime/Evaluator';

let evaluator: Evaluator;
// let physicstest = new Physics(evaluator);

test('basic test check', () => {
    expect(1 + 1).toBe(2)
})