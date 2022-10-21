import Evaluator from "../runtime/Evaluator";
import { test, expect } from "vitest";

test("Test text functions", () => {
    expect(Evaluator.evaluateCode('"hello".length()')?.toString()).toBe("5");
})