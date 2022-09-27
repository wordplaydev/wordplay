import { testConflict } from "../conflicts/TestUtilities";
import { MisplacedConversion } from "../conflicts/MisplacedConversion";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import ConversionDefinition from "./ConversionDefinition";

test("Test conversion conflicts", () => {

    testConflict('•Cat() (→ "" "meow")', '→ "" "meow"', ConversionDefinition, MisplacedConversion);
    testConflict('•Cat() (`hi`/eng`hola`/spa → "" "meow")', '•Cat() (`hi`/eng`hola`/eng → "" "meow")', ConversionDefinition, DuplicateLanguages);

});