import { expect, test } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['[1 2 3 :[4 5 6]]', '[1 2 3 4 5 6]'],
    ['[:[1 2 3] :[4 5 6]]', '[1 2 3 4 5 6]'],
    ['[1 2 3].add(4)', '[1 2 3 4]'],
    ['[1 2 3].has(4)', '⊥'],
    ['[1 2 3].has(3)', '⊤'],
    ['[1 2 3].length()', '3'],
    ['[1 2 3].first()', '1'],
    ['[1 2 3].last()', '3'],
    ['[1 2 3].reversed()', '[3 2 1]'],
    ['[1 2 3].sansFirst()', '[2 3]'],
    ['[1 2 3].sansLast()', '[1 2]'],
    ['[1 2 3].sans(2)', '[1 3]'],
    ['[1 2 3 1 2 3].sansAll(1)', '[2 3 2 3]'],
    ['[1 2 3].translate(ƒ(v) v + 1)', '[2 3 4]'],
    ['[1 2 3].filter(ƒ(v) v > 2)', '[3]'],
    ['[1 2 3].all(ƒ(v) v > 0)', '⊤'],
    ['[1 2 3].all(ƒ(v) v < 0)', '⊥'],
    ['[1 2 3].until(ƒ(v) v ≥ 3)', '[1 2]'],
    ['[1 3 5 7 9].find(ƒ(v) v > 6)', '7'],
    ['[1 2 3 4 5 6 7 8 9].combine(0 ƒ(sum v) sum + v) ', '45'],
    ["[1 2 3].join(', ')", '"1, 2, 3"'],
    ['[1 2 3 4 5].subsequence(1)', '[1 2 3 4 5]'],
    ['[1 2 3 4 5].subsequence(1 3)', '[1 2 3]'],
    ['[1 2 3 4 5].subsequence(3 5)', '[3 4 5]'],
    ['[1 2 3 4 5].subsequence(5 2)', '[5 4 3 2]'],
    ['[1 2 3 4 5].subsequence(-3 1)', '[1]'],
    ['[5 4 3 2 1].sorted()', '[1 2 3 4 5]'],
    ['[5 2 3 4 1].sorted()', '[1 2 3 4 5]'],
    ['["e" "d" "c" "b" "a"].sorted()', '["a" "b" "c" "d" "e"]'],
    ['["e" "b" "a" "c" "d"].sorted()', '["a" "b" "c" "d" "e"]'],
    ['["zzz" "yy" "x"].sorted()', '["x" "yy" "zzz"]'],
    ['["zzz" "π" "yy" "x"].sorted()', '["x" "yy" "zzz" "π"]'],
    ['[ø ø ø].sorted()', '[ø ø ø]'],
    ['[ø "hi" ø].sorted()', '[ø ø "hi"]'],
    ['[{3 2 1} {} {1 2}].sorted()', '!ConversionException'],
    ['[{} {1 2} {3 2 1}].sorted(ƒ(set•{#}) set.size())', '[{} {1 2} {3 2 1}]'],
    ['[1 2 3 4 5].sorted(ƒ(v) -v)', '[5 4 3 2 1]'],
    ['["い" "あ" "う" "お" "え"].sorted()', '["あ" "い" "う" "え" "お"]'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
