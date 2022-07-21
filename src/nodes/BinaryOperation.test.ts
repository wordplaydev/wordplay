import { IncompatibleOperand, IncompatibleUnits, testConflict } from "../parser/Conflict";
import Evaluator from "../runtime/Evaluator";
import BinaryOperation from "./BinaryOperation";

test("Test binary multiply, divide, exponent conflicts", () => {

    testConflict('1 * 5', '1 * ""', BinaryOperation, IncompatibleOperand);

});

test("Test binary associative conflicts", () => {

    testConflict('1 + 1', '1 + !', BinaryOperation, IncompatibleOperand);
    testConflict('1m + 1m', '1m + 1s', BinaryOperation, IncompatibleUnits);

});

test("Test binary boolean conflicts", () => {

    testConflict('⊥ ∨ ⊥', '⊥ ∨ 1', BinaryOperation, IncompatibleOperand);

});

test("Test boolean logic", () => {

    expect(Evaluator.evaluateCode("⊥ ∨ ⊥")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("⊥ ∨ ⊤")?.toString()).toBe("⊤");
    expect(Evaluator.evaluateCode("⊤ ∨ ⊤")?.toString()).toBe("⊤");
    expect(Evaluator.evaluateCode("⊥ ∧ ⊥")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("⊥ ∧ ⊤")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("⊤ ∧ ⊤")?.toString()).toBe("⊤");
    expect(Evaluator.evaluateCode("⊤ ∧ ¬⊤")?.toString()).toBe("⊥");
    expect(Evaluator.evaluateCode("¬(⊤ ∧ ⊤)")?.toString()).toBe("⊥");

});