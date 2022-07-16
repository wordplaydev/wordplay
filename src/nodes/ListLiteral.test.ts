import { IncompatibleValues, testConflict } from "../parser/Conflict";
import ListLiteral from "./ListLiteral";

test("Test list conflicts", () => {

    testConflict('[1 2 3]', '[1 2 "hi"]', ListLiteral, IncompatibleValues);

});