import { IncompatibleInputs, NotAFunction, NotInstantiable, testConflict } from "../parser/Conflict";
import Evaluator from "../runtime/Evaluator";
import Evaluate from "./Evaluate";

test("Test evaluate conflicts", () => {

    testConflict('add: ƒ(a•# b•#) a + b\nadd(1 2)', 'add: ƒ(a•# b•#) a + b\nsum(1 2)', Evaluate, NotAFunction);
    testConflict('•Cat() (add: ƒ(a•# b•#) a)\nCat()', '•Cat() (add: ƒ(a•# b•#) …)\nCat()', Evaluate, NotInstantiable);
    testConflict('•Cat(a•#) ()\nCat(1)', '•Cat(a•#) ()\nCat("hi")', Evaluate, IncompatibleInputs);

});

test("Test evaluate evaluation", () => {

    expect(Evaluator.evaluateCode("a: ƒ(a•# b•#) a + b\na(5 10)")?.toString()).toBe('15');

})