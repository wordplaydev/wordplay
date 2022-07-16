import { IncompatibleKey, testConflict } from "../parser/Conflict";
import SetOrMapAccess from "./SetOrMapAccess";

test("Test set access conflicts", () => {

    testConflict('{1:1 2:2 3:3}{1}', '{1:1 2:2 3:3}{"hi"}', SetOrMapAccess, IncompatibleKey);
    
});