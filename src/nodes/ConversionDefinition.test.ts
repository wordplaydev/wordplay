import { testConflict } from "../conflicts/TestUtilities";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import { test } from "vitest";
import Docs from "./Docs";

test("Test conversion conflicts", () => {

    testConflict('`hi`/eng`hola`/spa Cat → "" "meow"', '`hi`/eng`hola`/eng Cat → "" "meow"', Docs, DuplicateLanguages);

});