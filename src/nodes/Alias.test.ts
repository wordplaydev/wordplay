import { ExpectedLanguage, testConflict } from "../parser/Conflict";
import Alias from "./Alias";

test("Test alias conflicts", () => {

    testConflict('a/eng: ""', 'a/en: ""', Alias, ExpectedLanguage);

});