import { test } from "vitest";
import InvalidLanguage from "../conflicts/InvalidLanguage";
import MissingLanguage from "../conflicts/MissingLanguage";
import { testConflict } from "../conflicts/TestUtilities";
import Language from "./Language";

test("Test list access conflicts", () => {

    testConflict('a/eng: 5', 'a/aaa: 5', Language, InvalidLanguage);
    testConflict('a/eng: 5', 'a/: 5', Language, MissingLanguage);

});