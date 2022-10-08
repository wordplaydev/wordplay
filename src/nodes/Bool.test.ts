import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import Evaluator from "../runtime/Evaluator";
import Exception from "../runtime/Exception";

test("Test equality", () => {

    expect(Evaluator.evaluateCode(`${TRUE_SYMBOL} = ${TRUE_SYMBOL}`)?.toString()).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode(`${FALSE_SYMBOL} = ${TRUE_SYMBOL}`)?.toString()).toBe(FALSE_SYMBOL);
    expect(Evaluator.evaluateCode(`${FALSE_SYMBOL} = ${FALSE_SYMBOL}`)?.toString()).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode(`${TRUE_SYMBOL} = 1`)).toBeInstanceOf(Exception);

});