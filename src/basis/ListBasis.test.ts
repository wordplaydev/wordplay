import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { getDefaultBasis } from './Basis';

const basis = getDefaultBasis();

test.each([
    ['[1 2 3].add(4)', '[1 2 3 4]'],
    ['[1 2 3].has(4)', '⊥'],
    ['[1 2 3].has(3)', '⊤'],
    ['[1 2 3].length()', '3'],
    ['[1 2 3].first()', '1'],
    ['[1 2 3].last()', '3'],
    ['[1 2 3].reverse()', '[3 2 1]'],
    ['[1 2 3].sansFirst()', '[2 3]'],
    ['[1 2 3].sansLast()', '[1 2]'],
    ['[1 2 3].sans(2)', '[1 3]'],
    ['[1 2 3 1 2 3].sansAll(1)', '[2 3 2 3]'],
    ['[1 2 3].translate(ƒ(v) v + 1)', '[2 3 4]'],
    ['[1 2 3].filter(ƒ(v) v > 2)', '[3]'],
    ['[1 2 3].all(ƒ(v) v > 0)', '⊤'],
    ['[1 2 3].until(ƒ(v) v ≥ 3)', '[1 2]'],
    ['[1 3 5 7 9].find(ƒ(v) v > 6)', '7'],
    ['[1 2 3 4 5 6 7 8 9].combine(0 ƒ(sum v) sum + v) ', '45'],
    ["[1 2 3].join(', ')", '"1, 2, 3"'],
    ['[1 2 3 4 5].subsequence(1)', '[1 2 3 4 5]'],
    ['[1 2 3 4 5].subsequence(1 3)', '[1 2 3]'],
    ['[1 2 3 4 5].subsequence(3 5)', '[3 4 5]'],
    ['[1 2 3 4 5].subsequence(5 2)', '[5 4 3 2]'],
    ['[1 2 3 4 5].subsequence(-3 1)', '[1]'],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(basis, code)?.toString()).toBe(value);
});
