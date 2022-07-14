import { IncompatibleOperand, testConflict } from "../parser/Conflict";
import UnaryOperation from "./UnaryOperation";

test("Test unary conflicts", () => {

    testConflict('¬(1 > 1)', '¬"hi"', UnaryOperation, IncompatibleOperand);
    testConflict('-1', '-"hi"', UnaryOperation, IncompatibleOperand);
    testConflict('√1', '√"hi"', UnaryOperation, IncompatibleOperand);
    
});