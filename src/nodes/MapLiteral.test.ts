import { testConflict } from "../conflicts/TestUtilities";
import { NotAMap as NotAMap } from "../conflicts/NotAMap";
import MapLiteral from "./MapLiteral";

test("Test set or map conflicts", () => {

    testConflict('{1:1 2:2 3:3}', '{1:1 2 3:3}', MapLiteral, NotAMap);
    
});