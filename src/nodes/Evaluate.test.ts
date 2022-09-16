import { testConflict, testTypes } from "../conflicts/TestUtilities";
import { IncompatibleInput } from "../conflicts/IncompatibleInput";
import { NotInstantiable } from "../conflicts/NotInstantiable";
import { NotAFunction } from "../conflicts/NotAFunction";
import Evaluator from "../runtime/Evaluator";
import Evaluate from "./Evaluate";
import { MissingInput } from "../conflicts/MissingInput";
import { UnknownInputName } from "../conflicts/UnknownInputName";
import { RedundantNamedInput as RedundantInputName } from "../conflicts/RedundantNamedInput";
import TextType from "./TextType";
import MeasurementType from "./MeasurementType";

test("Test evaluate conflicts", () => {

    testConflict('add: ƒ(a•# b•#) a + b\nadd(1 2)', 'add: ƒ(a•# b•#) a + b\nsum(1 2)', Evaluate, NotAFunction);
    testConflict('•Cat() (add: ƒ(a•# b•#) a)\nCat()', '•Cat() (add: ƒ(a•# b•#) …)\nCat()', Evaluate, NotInstantiable);
    testConflict('•Cat(a•#) ()\nCat(1)', '•Cat(a•#) ()\nCat("hi")', Evaluate, IncompatibleInput);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'x: ƒ(a•# b•#) a - b\nx(1)', Evaluate, MissingInput);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'x: ƒ(a•# b•#) a - b\nx(a:1 c:2)', Evaluate, UnknownInputName);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'x: ƒ(a•# b•#) a - b\nx(a:1 a:2)', Evaluate, RedundantInputName);
    testConflict('x: ƒ(…num•#) a - b\nx(1 2 3)', 'x: ƒ(…num•"") a - b\nx(1 2 3)', Evaluate, IncompatibleInput);

});

test("Test evaluate evaluation", () => {

    expect(Evaluator.evaluateCode("x: ƒ(a•# b•#) a - b\nx(10 3)")?.toString()).toBe('7');
    expect(Evaluator.evaluateCode("x: ƒ(a•# b•#:1) a - b\nx(5)")?.toString()).toBe('4');
    expect(Evaluator.evaluateCode("x: ƒ(a•#:1 b•#:1) a - b\nx()")?.toString()).toBe('0');
    expect(Evaluator.evaluateCode("x: ƒ(a•#:1 b•#:1) a - b\nx(5)")?.toString()).toBe('4');
    expect(Evaluator.evaluateCode("x: ƒ(a•#:1 b•#:1) a - b\nx(a:4 b:2)")?.toString()).toBe('2');
    expect(Evaluator.evaluateCode("x: ƒ(a•#:1 b•#:1) a - b\nx(b:1 a:5)")?.toString()).toBe('4');
    expect(Evaluator.evaluateCode("x: ƒ(a•#:1 …b•#:1) [ a b ]\nx(1 5)")?.toString()).toBe('[1 [5]]');
    expect(Evaluator.evaluateCode("x: ƒ(a•#:1 …b•#:1) [ a b ]\nx(5 1)")?.toString()).toBe('[5 [1]]');

})

test("Test generics", () => {

    // Get the type from the evaluation's type input.
    testTypes("ƒ test∘T(a•T) a\ntest∘#(1)", MeasurementType);
    // Make sure it works for multiple inputs.
    testTypes("ƒ test∘T∘U∘V(a•V) a\ntest∘#∘''∘#(1)", MeasurementType);
    // Infer the type from an input.
    testTypes("ƒ test∘T(a•T) a\ntest(1)", MeasurementType);

})