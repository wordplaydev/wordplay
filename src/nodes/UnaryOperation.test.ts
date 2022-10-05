import { testConflict } from "../conflicts/TestUtilities";
import { IncompatibleOperand } from "../conflicts/IncompatibleOperand";
import UnaryOperation from "./UnaryOperation";
import Evaluator from "../runtime/Evaluator";

test("Test unary conflicts", () => {

    testConflict('¬(1 > 1)', '¬"hi"', UnaryOperation, IncompatibleOperand);
    testConflict('-1', '-"hi"', UnaryOperation, IncompatibleOperand);
    testConflict('√1', '√"hi"', UnaryOperation, IncompatibleOperand);
    
});

test("Test roots", () => {

    expect(Evaluator.evaluateCode("√1")?.toString()).toBe("1");
    expect(Evaluator.evaluateCode("√4")?.toString()).toBe("2");
    expect(Evaluator.evaluateCode("√4m")?.toString()).toBe("21/m");
    expect(Evaluator.evaluateCode("√4m·m")?.toString()).toBe("2m");
    expect(Evaluator.evaluateCode("√4m·m/s")?.toString()).toBe("2m/s·s");
 
});