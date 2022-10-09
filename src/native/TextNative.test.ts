import Evaluator from "../runtime/Evaluator";

test("Test text functions", () => {
    expect(Evaluator.evaluateCode('"hello".length()')?.toString()).toBe("5");
})