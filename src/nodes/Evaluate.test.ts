import { test, expect } from "vitest";
import { testConflict, testTypes } from "../conflicts/TestUtilities";
import IncompatibleInput from "../conflicts/IncompatibleInput";
import NotInstantiable from "../conflicts/NotInstantiable";
import NotAFunction from "../conflicts/NotAFunction";
import Evaluator from "../runtime/Evaluator";
import Evaluate from "./Evaluate";
import MissingInput from "../conflicts/MissingInput";
import UnexpectedInput from "../conflicts/UnexpectedInput";
import MeasurementType from "./MeasurementType";
import SetType from "./SetType";
import MapType from "./MapType";
import UnknownInput from "../conflicts/UnknownInput";
import UnionType from "./UnionType";

test("Test evaluate conflicts", () => {

    testConflict('add: ƒ(a•# b•#) a + b\nadd(1 2)', 'add: ƒ(a•# b•#) a + b\nsum(1 2)', Evaluate, NotAFunction);
    testConflict('•Cat() (add: ƒ(a•# b•#) a)\nCat()', '•Cat() (add: ƒ(a•# b•#) …)\nCat()', Evaluate, NotInstantiable);
    testConflict('•Cat(a•#) ()\nCat(1)', '•Cat(a•#) ()\nCat("hi")', Evaluate, IncompatibleInput);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(1)', Evaluate, MissingInput);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(a:1 c:2)', Evaluate, UnexpectedInput);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(a:1 b:2 c:3)', Evaluate, UnknownInput);
    testConflict('x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(a:1 a:2)', Evaluate, UnexpectedInput);
    testConflict('x: ƒ(…num•#) a - b\nx(1 2 3)', 'x: ƒ(…num•"") a - b\nx(1 2 3)', Evaluate, IncompatibleInput);

});

test("Test evaluate evaluation", () => {

    expect(Evaluator.evaluateCode("x: ƒ(a•# b•#) a - b\nx(10 3)")?.toString()).toBe('7');
    expect(Evaluator.evaluateCode("x: ƒ(a•# b•#) a - b\nx(a:10 b:3)")?.toString()).toBe('7');
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
    // Infer from lists
    testTypes("[ 1 2 3 ].random()", UnionType);
    // Infer from sets
    testTypes("{ 1 2 3 }.remove(1)", SetType);
    // Infer from map higher order function
    testTypes("{ 1:2 2:3 3:4 }.remove(1)", MapType);
    // Infer from map keys
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}", SetType);
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}→[]", ListType);
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}→[][1]", MeasurementType);
    // Infer from map values
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→[][1]", TextType);

})