import { testConflict } from "../conflicts/TestUtilities";
import ExpectedBooleanCondition from "../conflicts/ExpectedBooleanCondition";
import Evaluator from "../runtime/Evaluator";
import Conditional from "./Conditional";
import BinaryOperation from "./BinaryOperation";
import NotAFunction from "../conflicts/NotAFunction";
import { test, expect } from "vitest";

test.each([
    [ '⊥ ? 2 3"', '1 ? 2 3', Conditional, ExpectedBooleanCondition ],
    [   `
        a: 1 > 0 ? 1 "hi"
        a•# ? a + 1 a
        `, 
        `
        a: 1 > 0 ? 1 "hi"
        ⊤ ? a + 1 a
        `, 
        BinaryOperation, NotAFunction, 1 
    ],
    [ 
        `
        a: 1 > 0 ? 1 "hi"
        ((a•#) & (a > 1)) ? a + 1 a
        `, `
        a: 1 > 0 ? 1 "hi"
        ~((a•#) & (a > 1)) ? a + 1 a
        `, 
        BinaryOperation, NotAFunction, 3
    ],
    [ `
        •Cat(name•""|#)
        a: Cat(1)
        a.name•# ? a.name + 1 a
        `, `
        •Cat(name•""|#)
        a: Cat(1)
        a.name•"" ? a.name + 1 a
        `, 
        BinaryOperation, NotAFunction, 0 
    ],
    [ `
        a•#|"": 1
        a•# ? a + 1 a
        `, `
        a•#|"": 1
        ~(a•#) ? a + 1 a
        `, BinaryOperation, NotAFunction 
    ],
    [ `
        a•#|"": 1
        a•# ? a + 1 a`, `
        a•#|"": 1
        ~~(a•#) ? a a + 1
        `, BinaryOperation, NotAFunction 
    ]
])("%s => no conflict, %s => conflict", (good: string, bad: string, node: Function, conflict: Function, number?: number) => {
    testConflict(good, bad, node, conflict, number);    
});

test("Test conditional logic", () => {

    expect(Evaluator.evaluateCode("1 < 5 ? 'yes' 'no'")?.toString()).toBe('"yes"');
    expect(Evaluator.evaluateCode("1 > 5 ? 'yes' 'no'")?.toString()).toBe('"no"');
    expect(Evaluator.evaluateCode("1 > 5 ? 'yes' 1 > 0 ? 'maybe' 'no'")?.toString()).toBe('"maybe"');

});