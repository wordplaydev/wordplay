import { testConflict } from "../conflicts/TestUtilities";
import { UnknownTypeName } from "../conflicts/UnknownTypeName";
import NameType from "./NameType";

test("Test name type conflicts", () => {

    testConflict('•Cat() ()\na•Cat: Cat()', 'a•Cat: 1', NameType, UnknownTypeName);

});