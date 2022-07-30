import { DuplicateLanguages, MisplacedConversion, testConflict } from "../parser/Conflict";
import ConversionDefinition from "./ConversionDefinition";

test("Test conversion conflicts", () => {

    testConflict('•() (→ "" "meow")', '→ "" "meow"', ConversionDefinition, MisplacedConversion);
    testConflict('•() (`hi`/eng`hola`/spa → "" "meow")', '•() (`hi`/eng`hola`/eng → "" "meow")', ConversionDefinition, DuplicateLanguages);

});