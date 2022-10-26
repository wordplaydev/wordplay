import { test, expect } from "vitest";
import { testConflict } from "../conflicts/TestUtilities";
import UnusedBind from "../conflicts/UnusedBind";
import IncompatibleBind from "../conflicts/IncompatibleBind";
import DuplicateNames from "../conflicts/DuplicateNames";
import Evaluator from "../runtime/Evaluator";
import Bind from "./Bind";
import Names from "./Names";

test("Test bind conflicts", () => {

    testConflict('a, b: 1\na', 'a, a: 1\na', Names, DuplicateNames);
    testConflict('a•#: 1\na', 'a•"": 1\na', Bind, IncompatibleBind);
    testConflict('a: 1\na+a', 'a: 1\n1+1', Bind, UnusedBind);

});

test("Test binding logic", () => {

    expect(Evaluator.evaluateCode("a: 5\na")?.toString()).toBe("5");

});