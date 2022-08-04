import { testConflict } from "../conflicts/testConflict";
import { MissingShareLanguages } from "../conflicts/MissingShareLanguages";
import { MisplacedShare } from "../conflicts/MisplacedShare";
import Share from "./Share";

test("Test share conflicts", () => {

    testConflict('↑ a', 'ƒ(a) (↑ a)', Share, MisplacedShare);
    testConflict('↑ a/eng', '↑ a', Share, MissingShareLanguages);
    
});