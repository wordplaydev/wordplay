import Evaluator from "../runtime/Evaluator";

test("Test is", () => {

    expect(Evaluator.evaluateCode("1•#")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("1s•#")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("1s•#s")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("1s•#m")?.toString()).toBe('⊥');
    expect(Evaluator.evaluateCode("'hi'•#")?.toString()).toBe('⊥');
    expect(Evaluator.evaluateCode("'hi'•''")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("a: 1\na•#")?.toString()).toBe('⊤');

});
