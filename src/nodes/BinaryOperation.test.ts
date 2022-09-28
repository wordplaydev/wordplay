import { testConflict } from "../conflicts/TestUtilities";
import { IncompatibleUnits } from "../conflicts/IncompatibleUnits";
import { IncompatibleOperand } from "../conflicts/IncompatibleOperand";
import Evaluator from "../runtime/Evaluator";
import BinaryOperation from "./BinaryOperation";
import { FALSE_SYMBOL, OR_SYMBOL } from "../parser/Tokenizer";

test("Test binary multiply, divide, exponent conflicts", () => {

    testConflict('1 · 5', '1 · ""', BinaryOperation, IncompatibleOperand);

});

test("Test binary associative conflicts", () => {

    testConflict('1 + 1', '1 + !', BinaryOperation, IncompatibleOperand);
    testConflict('1m + 1m', '1m + 1s', BinaryOperation, IncompatibleUnits);

});

test("Test binary boolean conflicts", () => {

    testConflict(`${FALSE_SYMBOL} ${OR_SYMBOL} ${FALSE_SYMBOL}`, `${FALSE_SYMBOL} ${OR_SYMBOL} 1`, BinaryOperation, IncompatibleOperand);

});

test("Test boolean logic", () => {

    expect(Evaluator.evaluateCode("⊥ ∨ ⊥")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("⊥ ∨ ⊤")?.toString()).toBe("⊤");
    expect(Evaluator.evaluateCode("⊤ ∨ ⊤")?.toString()).toBe("⊤");
    expect(Evaluator.evaluateCode("⊥ ∧ ⊥")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("⊥ ∧ ⊤")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("⊤ ∧ ⊤")?.toString()).toBe("⊤");
    expect(Evaluator.evaluateCode("⊥ ∧ ⊤ ? 1 2")?.toString()).toBe("2");
    expect(Evaluator.evaluateCode("⊤ ∧ ¬⊤")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("¬(⊤ ∧ ⊤)")?.toString()).toBe("⊥");

});