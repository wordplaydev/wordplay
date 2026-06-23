import { test } from 'vitest';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import IncompatibleType from '@conflicts/IncompatibleType';
import { testConflict } from '@conflicts/TestUtilities';
import BinaryEvaluate from './BinaryEvaluate';
import Bind from './Bind';

/**
 * Unit type compatibility (#877). A unitless number (`#!` / a concrete literal) is incompatible
 * with a number that has a unit, while a bare `#` ("any unit") is compatible in both directions.
 */

test.each([
    // Addition/subtraction require matching units; a unitless operand rejects a unit'd one.
    ['1 + 1', '1 + 1s'],
    ['1m + 1m', '1m + 1s'],
    // Unit on the left, unitless on the right is also incompatible.
    ['1m + 1m', '1s + 1'],
    ['1 - 1', '1 - 1s'],
    // Comparisons require matching units too.
    ['1m < 2m', '1 < 2s'],
    ['1m ≥ 2m', '1 ≥ 2s'],
    // A bare `#` ("any unit") operand stays lenient: adding a unit'd number is allowed.
    ['x•#: 1\nx + 2s', '1 + 1s'],
])('addition/comparison units: %s ok, %s conflicts', (good, bad) => {
    testConflict(good, bad, BinaryEvaluate, IncompatibleInput);
});

test.each([
    // Multiplication/division combine units, so any unit is acceptable.
    ['1 · 1m', '1 + 1s'],
    ['2m ÷ 2s', '1 + 1s'],
])('multiply/divide accept any unit: %s ok', (good, bad) => {
    testConflict(good, bad, BinaryEvaluate, IncompatibleInput);
});

test.each([
    // `#` (any unit) accepts a value with any unit; `#!` (no unit) accepts only unitless.
    ['x•#: 1s', 'x•#!: 1s'],
    ['x•#!: 1', 'x•#!: 1m'],
    // A specific unit accepts only that exact unit.
    ['x•#m: 1m', 'x•#m: 1s'],
    ['x•#m: 1m', 'x•#m: 1'],
])('bind unit annotations: %s ok, %s conflicts', (good, bad) => {
    testConflict(good, bad, Bind, IncompatibleType);
});
