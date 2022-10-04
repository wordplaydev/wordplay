import { testConflict } from "../conflicts/TestUtilities";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import ConversionDefinition from "./ConversionDefinition";

test("Test conversion conflicts", () => {

    testConflict('•Cat() (`hi`/eng`hola`/spa Cat → "" "meow")', '•Cat() (`hi`/eng`hola`/eng Cat → "" "meow")', ConversionDefinition, DuplicateLanguages);

});