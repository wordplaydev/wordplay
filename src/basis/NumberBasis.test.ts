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
