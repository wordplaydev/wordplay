import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';

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
    // List access is cyclic, so a find that matches nothing once handed back
    // the first item instead of ø.
    ['[1 3 5 7 9].find(ƒ(v) v > 100)', 'ø'],
    ['[1 3 5 7 9].find(ƒ(v) v < 0)', 'ø'],
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

// A list function whose input is a predicate must declare that predicate as
// evaluating to a boolean. List.find declared its checker as evaluating to an
// item of the list instead, so every real predicate was rejected during
// analysis — reported, confusingly, as a mismatch in the number of inputs.
// Evaluation was unaffected, so only conflict checking catches this.
test.each([
    ['[1 3 5 7 9].find(ƒ(v) v > 6)'],
    ['[1 3 5 7 9].find(ƒ(v index) (v > 6) & (index > 0))'],
    ['[1 3 5 7 9].find(ƒ(v index list) (v > 6) & (index < list.length()))'],
    ['[1 3 5 7 9].filter(ƒ(v) v > 6)'],
    ['[1 3 5 7 9].all(ƒ(v) v > 6)'],
    ['[1 3 5 7 9].until(ƒ(v) v > 6)'],
])('Expect %s to have no conflicts', (code) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    expect(
        Array.from(project.analyze().conflictedNodes.values()).flat(),
    ).toHaveLength(0);
});

test('reversing a list leaves the original alone', () => {
    // Array.reverse is in place, so this used to rewrite x.
    expect(evaluateCode('x: [1 2 3]\ny: x.reverse()\nx')?.toWordplay()).toBe(
        '[1 2 3]',
    );
    expect(evaluateCode('x: [1 2 3]\nx.reverse()')?.toWordplay()).toBe(
        '[3 2 1]',
    );
});

// One definition now carries all four names, and every one of them removes
// every copy — which is what the code always did.
test.each(['without', 'sans', 'withoutAll', 'sansAll'])(
    '%s removes every occurrence',
    (name) => {
        expect(evaluateCode(`[1 2 2 3].${name}(2)`)?.toWordplay()).toBe(
            '[1 3]',
        );
    },
);

test('a not-a-number key sorts to the end without disturbing the rest', () => {
    // Subtracting to compare gave NaN for every pair touching the bad key, an
    // inconsistent comparator that could scramble unrelated elements.
    expect(
        evaluateCode("[3 1 2].sorted(ƒ(n•#) n = 1 ? 'x' → # n)")?.toWordplay(),
    ).toBe('[2 3 1]');
    expect(
        evaluateCode("['b' 'a' 'c'].sorted(ƒ(t•'') 'x' → #)")?.toWordplay(),
    ).toBe('["b" "a" "c"]');
});
