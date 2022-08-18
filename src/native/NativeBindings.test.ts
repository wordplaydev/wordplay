import Evaluator from "../runtime/Evaluator";

test("Test list functions", () => {

    expect(Evaluator.evaluateCode("[1 2 3].first()")?.toString()).toBe('1');
    expect(Evaluator.evaluateCode("[1 2 3].last()")?.toString()).toBe('3');
    expect(Evaluator.evaluateCode("[1 2 3].withoutFirst()")?.toString()).toBe('[2 3]');
    expect(Evaluator.evaluateCode("[1 2 3].withoutLast()")?.toString()).toBe('[1 2]');

});

test("Test set functions", () => {

    expect(Evaluator.evaluateCode("{1 2 3}.add(1)")?.toString()).toBe('{1 2 3}');
    expect(Evaluator.evaluateCode("{1 2 3}.add(4)")?.toString()).toBe('{1 2 3 4}');
    expect(Evaluator.evaluateCode("{1 2 3}.remove(1)")?.toString()).toBe('{2 3}');
    expect(Evaluator.evaluateCode("{1 2 3}.union({3 4})")?.toString()).toBe('{1 2 3 4}');
    expect(Evaluator.evaluateCode("{1 2 3}.intersection({2 3 4})")?.toString()).toBe('{2 3}');
    expect(Evaluator.evaluateCode("{1 2 3}.difference({3 4 5})")?.toString()).toBe('{1 2}');

});