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
import InvalidTypeInput from "../conflicts/InvalidTypeInput";

test.each([
    [ 'add: ƒ(a•# b•#) a + b\nadd(1 2)', 'add: ƒ(a•# b•#) a + b\nsum(1 2)', Evaluate, NotAFunction ],
    [ '•Cat() (add: ƒ(a•# b•#) a)\nCat()', '•Cat() (add: ƒ(a•# b•#) …)\nCat()', Evaluate, NotInstantiable ],
    [ '•Cat(a•#) ()\nCat(1)', '•Cat(a•#) ()\nCat("hi")', Evaluate, IncompatibleInput ],
    [ 'x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(1)', Evaluate, MissingInput ],
    [ 'x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(a:1 c:2)', Evaluate, UnexpectedInput ],
    [ 'x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(a:1 b:2 c:3)', Evaluate, UnknownInput ],
    [ 'x: ƒ(a•# b•#) a - b\nx(1 2)', 'ƒ x(a•# b•#) a - b\nx(a:1 a:2)', Evaluate, UnexpectedInput ],
    [ 'x: ƒ(…num•#) a - b\nx(1 2 3)', 'x: ƒ(…num•"") a - b\nx(1 2 3)', Evaluate, IncompatibleInput ],
    [ '(ƒ() 5)()', '(ƒ() 5 5)()', Evaluate, NotAFunction ],
    // Type inputs have to be declared
    [ '•Cat⸨Desire⸩()\nCat⸨#⸩()', '•Cat()\nCat⸨#⸩()', Evaluate, InvalidTypeInput ],
    // A function has to exist on all possible types of an expression
    [
        `
        a: [ 1 1 ].random()
        a.add(1)
        `,
        `
        a: [ 1 "2" ].random()
        a.length()
        `,
        Evaluate, NotAFunction, 1
    ]
])("%s => none, %s => conflict", (good: string, bad: string, node: Function, conflict: Function, number?: number) => {
    testConflict(good, bad, node, conflict, number);
});

test.each([
    [ "x: ƒ(a•# b•#) a - b\nx(10 3)", '7' ], 
    [ "x: ƒ(a•# b•#) a - b\nx(a:10 b:3)", '7' ], 
    [ "x: ƒ(a•# b•#:1) a - b\nx(5)", '4' ], 
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx()", '0' ], 
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx(5)", '4' ], 
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx(a:4 b:2)", '2' ], 
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx(b:1 a:5)", '4' ], 
    [ "x: ƒ(a•#:1 …b•#:1) [ a b ]\nx(1 5)", '[1 [5]]' ], 
    [ "x: ƒ(a•#:1 …b•#:1) [ a b ]\nx(5 1)", '[5 [1]]' ],
    [ "x: ƒ(a•# b•#) a - b\nx(10 3)", '7' ],
    [ "x: ƒ(a•# b•#) a - b\nx(a:10 b:3)", '7' ],
    [ "x: ƒ(a•# b•#:1) a - b\nx(5)", '4' ],
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx()", '0' ],
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx(5)", '4' ],
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx(a:4 b:2)", '2' ],
    [ "x: ƒ(a•#:1 b•#:1) a - b\nx(b:1 a:5)", '4' ],
    [ "x: ƒ(a•#:1 …b•#:1) [ a b ]\nx(1 5)", '[1 [5]]' ],
    [ "x: ƒ(a•#:1 …b•#:1) [ a b ]\nx(5 1)", '[5 [1]]' ],
])("%s = %s", (code: string, value: string) => {
    expect(Evaluator.evaluateCode(code)?.toString()).toBe(value);
})

test("Test generics", () => {

    // Get the type from the evaluation's type input.
    testTypes("ƒ test⸨T⸩(a•T) a\ntest⸨#⸩(1)", MeasurementType);
    // Make sure it works for multiple inputs.
    testTypes("ƒ test⸨T U V⸩(a•V) a\ntest⸨# '' #⸩(1)", MeasurementType);
    // Infer the type from an input.
    testTypes("ƒ test⸨T⸩(a•T) a\ntest(1)", MeasurementType);
    // Infer from lists
    testTypes("[ 1 2 3 ].random()", UnionType);
    // Infer from sets
    testTypes("{ 1 2 3 }.remove(1)", SetType);
    // Infer from map higher order function
    testTypes("{ 1:2 2:3 3:4 }.remove(1)", MapType);

    testTypes(`
        •Cat⸨Kind⸩(a•Kind)
        Cat⸨""⸩("hi").a.length()
    `, MeasurementType)

    // Infer from map keys
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}", SetType);
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}→[]", ListType);
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}→[][1]", MeasurementType);
    // Infer from map values
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→[][1]", TextType);

})