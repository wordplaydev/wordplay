import { NotAListIndex, testConflict } from "../parser/Conflict";
import ListAccess from "./ListAccess";

test("Test list access conflicts", () => {

    testConflict('[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, NotAListIndex);

});