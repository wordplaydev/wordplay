import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import IncompatibleType from '#conflicts/IncompatibleType.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Bind from '#nodes/Bind.ts';
import Match from '#nodes/Match.ts';
import evaluateCode from '#runtime/evaluate.ts';
import ConversionException from '#values/ConversionException.ts';
import RangeValue from '#values/RangeValue.ts';
import { expect, test } from 'vitest';

/** Ranges, as LANGUAGE.md's Range section specifies them. */

test.each([
    // Construction carries the bounds, and their unit.
    ['1‥10', '1‥10'],
    ['1m‥3m', '1m‥3m'],
    ['a: 3\n1‥a', '1‥3'],
    // Containment includes both bounds and ignores which was written first.
    ['(1‥10) ∋ 7', '⊤'],
    ['(10‥1) ∋ 7', '⊤'],
    ['(1‥10) ∋ 1', '⊤'],
    ['(1‥10) ∋ 10', '⊤'],
    ['(1‥10) ∋ 11', '⊥'],
    ['(1‥10) ∋ 0.5', '⊥'],
    ['(1m‥3m) ∋ 2m', '⊤'],
    ['(1‥3).has(2)', '⊤'],
    // Converting counts by one from the start toward the end.
    ['(1‥5) → []', '[1 2 3 4 5]'],
    ['(-2‥2) → []', '[-2 -1 0 1 2]'],
    ['(3‥3) → []', '[3]'],
    ['(0.5‥2.5) → []', '[0.5 1.5 2.5]'],
    ['(1.5‥-1.5) → []', '[1.5 0.5 -0.5 -1.5]'],
    ['(1m‥3m) → []', '[1m 2m 3m]'],
    ['(1‥3) → {}', '{1 2 3}'],
    // A range spreads into a list literal, and counts down when its end is below its start.
    ['[:1‥5]', '[1 2 3 4 5]'],
    ['[:5‥1]', '[5 4 3 2 1]'],
    ['[:1‥3 4]', '[1 2 3 4]'],
    // Equality compares both bounds in order; direction is part of a range.
    ['(1‥3) = (1‥3)', '⊤'],
    ['(1‥3) = (3‥1)', '⊥'],
    ['(1‥3) ≠ (1‥4)', '⊤'],
    ['(1‥3) = 4', '⊥'],
    // A range is a match key holding every number between its bounds.
    ["70 ???\n  0‥59: 'try'\n  60‥79: 'pass'\n  'great'", '"pass"'],
    ["90 ???\n  0‥59: 'try'\n  60‥79: 'pass'\n  'great'", '"great"'],
    ["59 ???\n  0‥59: 'try'\n  60‥79: 'pass'\n  'great'", '"try"'],
    // Ranges convert to text like every other value.
    ["(1‥3) → ''", '"1‥3"'],
])('%s => %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test('a range value is a range', () => {
    expect(evaluateCode('1‥10')).toBeInstanceOf(RangeValue);
});

test.each(['(1‥∞) → []', '(∞‥1) → []', '[:1‥∞]'])(
    'an unbounded range has no list to make: %s',
    (code) => {
        expect(evaluateCode(code)).toBeInstanceOf(ConversionException);
    },
);

// Units: the bounds must share one, as inequalities require, and the range carries it.
test.each([
    ['1‥10', '1‥10m', BinaryEvaluate, IncompatibleInput, 0],
    ['1m‥10m', '1m‥10s', BinaryEvaluate, IncompatibleInput, 0],
    ['(1m‥3m) ∋ 2m', '(1m‥3m) ∋ 2', BinaryEvaluate, IncompatibleInput, 1],
    ['5s ??? 1s‥10s: 1 2', '5 ??? 1s‥10s: 1 2', Match, IncompatibleType, 0],
] as const)('%s ok, %s conflicts', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});

// Range types follow the three unit cases number types do.
test.each([
    ['r•‥: 1‥2', 'r•‥!: 1m‥2m'],
    ['r•‥: 1m‥2m', 'r•‥m: 1‥2'],
    ['r•‥m: 1m‥2m', 'r•‥m: 1s‥2s'],
    ['r•‥!: 1‥2', 'r•‥!: 1m‥2m'],
    ['r•‥: 1‥2', 'r•‥: 1'],
])('%s ok, %s conflicts', (good, bad) => {
    testConflict(good, bad, Bind, IncompatibleType);
});
