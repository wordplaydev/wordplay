import { testConflict } from "../conflicts/TestUtilities";
import { ExpectedBooleanCondition } from "../conflicts/ExpectedBooleanCondition";
import Evaluator from "../runtime/Evaluator";
import Conditional from "./Conditional";
import BinaryOperation from "./BinaryOperation";
import NotAFunction from "../conflicts/NotAFunction";

test("Test conditional conflicts", () => {

    testConflict('⊥ ? 2 3"', '1 ? 2 3', Conditional, ExpectedBooleanCondition);
    testConflict('a: 1 > 0 ? 1 "hi"\na•# ? a + 1 a', 'a: 1 > 0 ? 1 "hi"\n⊤ ? a + 1 a', BinaryOperation, NotAFunction, 1);
    testConflict('a: 1 > 0 ? 1 "hi"\n((a•#)∧(a > 1)) ? a + 1 a', 'a: 1 > 0 ? 1 "hi"\n¬((a•#)∧(a > 1)) ? a + 1 a', BinaryOperation, NotAFunction, 3);
    testConflict('•Cat(name•""•#)\n a: Cat(1)\n a.name•# ? a.name + 1 a', '•Cat(name•""•#)\n a: Cat(1)\n a.name•"" ? a.name + 1 a', BinaryOperation, NotAFunction, 0);
    testConflict('a•#•"": 1\na•# ? a + 1 a', 'a•#•"": 1\n¬(a•#) ? a + 1 a', BinaryOperation, NotAFunction);
    testConflict('a•#•"": 1\na•# ? a + 1 a', 'a•#•"": 1\n¬¬(a•#) ? a a + 1', BinaryOperation, NotAFunction);
    
});

test("Test conditional logic", () => {

    expect(Evaluator.evaluateCode("1 < 5 ? 'yes' 'no'")?.toString()).toBe('"yes"');
    expect(Evaluator.evaluateCode("1 > 5 ? 'yes' 'no'")?.toString()).toBe('"no"');
    expect(Evaluator.evaluateCode("1 > 5 ? 'yes' 1 > 0 ? 'maybe' 'no'")?.toString()).toBe('"maybe"');

});