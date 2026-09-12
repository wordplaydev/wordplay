import { test } from 'vitest';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import IncompatibleType from '@conflicts/IncompatibleType';
import { testConflict } from '@conflicts/TestUtilities';
import BinaryEvaluate from './BinaryEvaluate';
import Bind from './Bind';
import Evaluate from './Evaluate';

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

/**
 * The new math functions, which carry units through by ordinary arithmetic rules.
 *
 * `rescale` is the one that needed the deriver to see past its first input: its result is
 * in the unit of the range you asked for, so a bound in the wrong unit has to be caught
 * on the argument rather than waved through.
 */
test.each([
    // limit's bounds are measured against me, so they share my unit.
    ['(12m).limit(0m 10m)', '(12m).limit(0m 10s)'],
    // toward's other number shares my unit; its amount is a plain fraction.
    ['(0m).toward(10m 30%)', '(0m).toward(10s 30%)'],
    ['(0m).toward(10m 30%)', '(0m).toward(10m 30s)'],
    // rescale's from-bounds share mine; its to-bounds are free to be anything.
    ['(5m).rescale(0m 10m 0s 100s)', '(5m).rescale(0m 10s 0s 100s)'],
])('unit-carrying math: %s ok, %s conflicts', (good, bad) => {
    testConflict(good, bad, Evaluate, IncompatibleInput);
});
