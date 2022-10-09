import Evaluator from "../runtime/Evaluator";

test("Test map functions", () => {

    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.set(3 "hello")')?.toString()).toBe('{1:"hi" 2:"bye" 3:"hello"}');
    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.set(1 "hello")')?.toString()).toBe('{1:"hello" 2:"bye"}');
    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.unset(1)')?.toString()).toBe('{2:"bye"}');    
    expect(Evaluator.evaluateCode('{1:"hi" 2:"bye"}.remove("bye")')?.toString()).toBe('{1:"hi"}');
    expect(Evaluator.evaluateCode("{'cat':1 'dog':2 'mouse':3}.filter(ƒ(k v) v ≥ 3)")?.toString()).toBe('{"mouse":3}');
    expect(Evaluator.evaluateCode("{'cat':1 'dog':2 'mouse':3}.translate(ƒ(k v) -v)")?.toString()).toBe('{"cat":-1 "dog":-2 "mouse":-3}');

});
