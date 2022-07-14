import { IncompatibleValues, NotASetOrMap, testConflict } from "../parser/Conflict";
import SetOrMap from "./SetOrMap";

test("Test set or map conflicts", () => {

    testConflict('{1:1 2:2 3:3}', '{1:1 2 3:3}', SetOrMap, NotASetOrMap);
    testConflict('{1:1 2:2 3:3}', '{1:1 2:"" 3:!}', SetOrMap, IncompatibleValues);
    testConflict('{1:1 2:2 3:3}', '{1:1 "":2 "":3}', SetOrMap, IncompatibleValues);
    testConflict('{1 2 3}', '{1 "" 3}', SetOrMap, IncompatibleValues);
    
});