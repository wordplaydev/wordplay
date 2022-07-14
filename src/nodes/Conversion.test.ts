import { DuplicateLanguages, MisplacedConversion, testConflict } from "../parser/Conflict";
import Conversion from "./Conversion";

test("Test conversion conflicts", () => {

    testConflict('•() (→ "" "meow")', '→ "" "meow"', Conversion, MisplacedConversion);
    testConflict('•() (`hi`eng`hola`spa → "" "meow")', '•() (`hi`eng`hola`eng → "" "meow")', Conversion, DuplicateLanguages);

});