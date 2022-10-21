import { test, expect } from "vitest";
import { testConflict } from "../conflicts/TestUtilities";
import { UnusedBind } from "../conflicts/UnusedBind";
import { IncompatibleBind } from "../conflicts/IncompatibleBind";
import DuplicateAliases from "../conflicts/DuplicateAliases";
import Evaluator from "../runtime/Evaluator";
import Bind from "./Bind";

test("Test bind conflicts", () => {

    testConflict('a, b: 1\na', 'a, a: 1\na', Bind, DuplicateAliases);
    testConflict('a•#: 1\na', 'a•"": 1\na', Bind, IncompatibleBind);
    testConflict('a: 1\na+a', 'a: 1\n1+1', Bind, UnusedBind);

});

test("Test binding logic", () => {

    expect(Evaluator.evaluateCode("a: 5\na")?.toString()).toBe("5");

});