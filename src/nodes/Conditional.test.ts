import { testConflict } from "../conflicts/TestUtilities";
import { ExpectedBooleanCondition } from "../conflicts/ExpectedBooleanCondition";
import Evaluator from "../runtime/Evaluator";
import Conditional from "./Conditional";

test("Test conditional conflicts", () => {

    testConflict('⊥ ? 2 3"', '1 ? 2 3', Conditional, ExpectedBooleanCondition);

});

test("Test conditional logic", () => {

    expect(Evaluator.evaluateCode("1 < 5 ? 'yes' 'no'")?.toString()).toBe('"yes"');
    expect(Evaluator.evaluateCode("1 > 5 ? 'yes' 'no'")?.toString()).toBe('"no"');
    expect(Evaluator.evaluateCode("1 > 5 ? 'yes' 1 > 0 ? 'maybe' 'no'")?.toString()).toBe('"maybe"');

});