import { IncompatibleOperand, IncompatibleUnits, testConflict } from "../parser/Conflict";
import { parse } from "../parser/Parser";
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