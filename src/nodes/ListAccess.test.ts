import { NotAListIndex, testConflict } from "../parser/Conflict";
import Evaluator from "../runtime/Evaluator";
import ListAccess from "./ListAccess";

test("Test list access conflicts", () => {

    testConflict('[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, NotAListIndex);

});

test("Test list access evaluation", () => {

    expect(Evaluator.evaluateCode("[1 2 3][2]")?.toString()).toBe('2');

});