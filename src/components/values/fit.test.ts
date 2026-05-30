import { expect, test } from 'vitest';
import { DEFAULT_BUDGET, fitCount } from './fit';

const uniform = (each: number) => () => each;

test('an empty collection yields at least 1', () => {
    expect(fitCount(uniform(1), 0)).toBe(1);
});

test('a single oversized unit still shows itself', () => {
    expect(fitCount(uniform(DEFAULT_BUDGET + 100), 10)).toBe(1);
});

test('many tiny units grow toward, but never exceed, the length', () => {
    // 1000 units of size 1 fit far more than the budget allows, so the count
    // is budget-bounded, not length-bounded.
    const n = fitCount(uniform(1), 1000, 10);
    expect(n).toBe(10);

    // When everything fits, return the full length.
    expect(fitCount(uniform(1), 5, 10)).toBe(5);
});

test('boundary: sum exactly at budget still fits; just over does not', () => {
    // sizes [5,5] with budget 10: after index 1 total is 10 (not > 10), so both fit.
    expect(fitCount((i) => [5, 5][i], 2, 10)).toBe(2);
    // sizes [5,6] with budget 10: index 1 pushes total to 11 (> 10), so 1 fits.
    expect(fitCount((i) => [5, 6][i], 2, 10)).toBe(1);
});

test('lazy: only measures leading units until the budget is exceeded', () => {
    let calls = 0;
    const size = () => {
        calls++;
        return 4;
    };
    // budget 10, unit size 4: index 0 → 4, index 1 → 8, index 2 → 12 (> 10, stop).
    fitCount(size, 1000, 10);
    expect(calls).toBe(3);
});
