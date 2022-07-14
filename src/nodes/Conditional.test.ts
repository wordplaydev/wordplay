import { ExpectedBooleanCondition, IncompatibleConditionalBranches, testConflict } from "../parser/Conflict";
import Conditional from "./Conditional";

test("Test conditional conflicts", () => {

    testConflict('⊥ ? 2 3"', '1 ? 2 3', Conditional, ExpectedBooleanCondition);
    testConflict('⊥ ? 2 3"', '⊥ ? 2 !', Conditional, IncompatibleConditionalBranches);

});