import { IncompatibleValues, testConflict } from "../parser/Conflict";
import List from "./List";

test("Test list conflicts", () => {

    testConflict('[1 2 3]', '[1 2 "hi"]', List, IncompatibleValues);

});