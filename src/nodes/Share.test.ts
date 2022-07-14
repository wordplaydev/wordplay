import { MisplacedShare, MissingShareLanguages, testConflict } from "../parser/Conflict";
import Share from "./Share";

test("Test share conflicts", () => {

    testConflict('↑ a', 'ƒ(a) (↑ a)', Share, MisplacedShare);
    testConflict('↑ a/eng', '↑ a', Share, MissingShareLanguages);
    
});