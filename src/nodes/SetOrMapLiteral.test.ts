import { IncompatibleValues, NotASetOrMap, testConflict } from "../parser/Conflict";
import SetOrMapLiteral from "./SetOrMapLiteral";

test("Test set or map conflicts", () => {

    testConflict('{1:1 2:2 3:3}', '{1:1 2 3:3}', SetOrMapLiteral, NotASetOrMap);
    testConflict('{1:1 2:2 3:3}', '{1:1 2:"" 3:!}', SetOrMapLiteral, IncompatibleValues);
    testConflict('{1:1 2:2 3:3}', '{1:1 "":2 "":3}', SetOrMapLiteral, IncompatibleValues);
    testConflict('{1 2 3}', '{1 "" 3}', SetOrMapLiteral, IncompatibleValues);
    
});