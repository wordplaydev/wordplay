import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import Evaluator from "./Evaluator";

test("Test equality", () => {

    expect(Evaluator.evaluateCode("{} = {}")?.toString()).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode("{1} = {1}")?.toString()).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode("{1} = {1 2}")?.toString()).toBe(FALSE_SYMBOL);
    expect(Evaluator.evaluateCode("{1 2} = {1}")?.toString()).toBe(FALSE_SYMBOL);
    expect(Evaluator.evaluateCode("{1 2} ≠ {1}")?.toString()).toBe(TRUE_SYMBOL);

});