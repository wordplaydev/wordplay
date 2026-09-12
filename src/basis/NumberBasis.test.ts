import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

// Part B (#1237 example support): logarithms, exponentials, and the remaining
// trigonometric functions on the Number basis.
test.each([
    // Logarithm with a base.
    ['8.log(2)', '3'],
    ['100.log(10)', '2'],
    ['81.log(3)', '4'],
    // Natural logarithm when no base is given.
    ['1.log()', '0'],
    // exp is the inverse of the natural log.
    ['0.exp()', '1'],
    ['(1.exp()).log()', '1'],
    // Tangent and inverse trig round-trip.
    ['0.tan()', '0'],
    ['0.arcsin()', '0'],
    ['1.arccos()', '0'],
    ['0.arctan()', '0'],
])('%s = %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

// Logarithms are unitless even when the input carries a unit, since a logarithm
// is only meaningful on a ratio.
test('log of a united number is unitless', () => {
    expect(evaluateCode('(8m).log(2)')?.toString()).toBe('3');
});

// limit, toward and rescale. The unit is asserted by the printed suffix — `'50s'`
// rather than `'50'` or `'50m'` is the whole unit test.
test.each([
    // limit keeps me between the bounds, and keeps my unit.
    ['12.limit(0 10)', '10'],
    ['-3.limit(0 10)', '0'],
    ['5.limit(0 10)', '5'],
    ['(12m).limit(0m 10m)', '10m'],

    // toward: 0% is me, 100% is the other, and it keeps going past either end.
    ['(0m).toward(10m 30%)', '3m'],
    ['(0m).toward(10m 0%)', '0m'],
    ['(0m).toward(10m 100%)', '10m'],
    ['(0m).toward(10m 150%)', '15m'],
    ['(10m).toward(0m 50%)', '5m'],

    // rescale takes its unit from the range you asked for, not from mine.
    ['(5m).rescale(0m 10m 0s 100s)', '50s'],
    ['(300hz).rescale(80hz 400hz -4m 5m)', '2.1875m'],
    // A zero-width range has no answer, so it gives back the low end.
    ['(5m).rescale(2m 2m 0s 100s)', '0s'],
])('%s = %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

// A bound in another unit is a mistake worth reporting rather than quietly ignoring,
// which is what `min`/`max` do today.
test.each([
    ['(12m).limit(0m 10s)'],
    ['(0m).toward(10s 30%)'],
    ['(5m).rescale(0m 10s 0s 100s)'],
])('%s is a type exception', (code) => {
    expect(evaluateCode(code)?.toString()).toContain('Exception');
});
