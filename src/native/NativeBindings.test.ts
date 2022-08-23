import Evaluator from "../runtime/Evaluator";

test("Test list functions", () => {

    expect(Evaluator.evaluateCode("[1 2 3].add(4)")?.toString()).toBe('[1 2 3 4]');
    expect(Evaluator.evaluateCode("[1 2 3].first()")?.toString()).toBe('1');
    expect(Evaluator.evaluateCode("[1 2 3].last()")?.toString()).toBe('3');
    expect(Evaluator.evaluateCode("[1 2 3].reverse()")?.toString()).toBe('[3 2 1]');
    expect(Evaluator.evaluateCode("[1 2 3].sansFirst()")?.toString()).toBe('[2 3]');
    expect(Evaluator.evaluateCode("[1 2 3].sansLast()")?.toString()).toBe('[1 2]');
    expect(Evaluator.evaluateCode("[1 2 3].sans(2)")?.toString()).toBe('[1 3]');
    expect(Evaluator.evaluateCode("[1 2 3 1 2 3].sansAll(1)")?.toString()).toBe('[2 3 2 3]');
    expect(Evaluator.evaluateCode("[1 2 3].translate(ƒ(v) v + 1)")?.toString()).toBe('[2 3 4]');
    expect(Evaluator.evaluateCode("[1 2 3].filter(ƒ(v) v > 2)")?.toString()).toBe('[3]');
    expect(Evaluator.evaluateCode("[1 2 3].all(ƒ(v) v > 0)")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("[1 2 3].until(ƒ(v) v < 3)")?.toString()).toBe('[1 2]');
    expect(Evaluator.evaluateCode("[1 3 5 7 9].find(ƒ(v) v > 6)")?.toString()).toBe('7');
    expect(Evaluator.evaluateCode("[1 2 3 4 5 6 7 8 9].combine(0 ƒ(sum v) sum + v) ")?.toString()).toBe('45');
    
});

test("Test set functions", () => {

    expect(Evaluator.evaluateCode("{1 2 3}.add(1)")?.toString()).toBe('{1 2 3}');
    expect(Evaluator.evaluateCode("{1 2 3}.add(4)")?.toString()).toBe('{1 2 3 4}');
    expect(Evaluator.evaluateCode("{1 2 3}.remove(1)")?.toString()).toBe('{2 3}');
    expect(Evaluator.evaluateCode("{1 2 3}.union({3 4})")?.toString()).toBe('{1 2 3 4}');
    expect(Evaluator.evaluateCode("{1 2 3}.intersection({2 3 4})")?.toString()).toBe('{2 3}');
    expect(Evaluator.evaluateCode("{1 2 3}.difference({3 4 5})")?.toString()).toBe('{1 2}');
    expect(Evaluator.evaluateCode("{1 2 3}.filter(ƒ(v) v % 2 = 1)")?.toString()).toBe('{1 3}');

});

test("Test map functions", () => {

    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.set(3 "hello")')?.toString()).toBe('{1:"hi" 2:"bye" 3:"hello"}');
    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.set(1 "hello")')?.toString()).toBe('{1:"hello" 2:"bye"}');
    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.unset(1)')?.toString()).toBe('{2:"bye"}');    
    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.remove("bye")')?.toString()).toBe('{1:"hi"}');
    expect(Evaluator.evaluateCode("{'cat':1 'dog':2 'mouse':3}.filter(ƒ(k v) v ≥ 3)")?.toString()).toBe('{"mouse":3}');
    expect(Evaluator.evaluateCode("{'cat':1 'dog':2 'mouse':3}.translate(ƒ(k v) -v)")?.toString()).toBe('{"cat":-1 "dog":-2 "mouse":-3}');

});