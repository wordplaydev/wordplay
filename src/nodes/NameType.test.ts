import { testConflict } from "../conflicts/testConflict";
import { UnknownTypeName } from "../conflicts/UnknownTypeName";
import NameType from "./NameType";

test("Test name type conflicts", () => {

    testConflict('•Cat() ()\na•Cat: Cat()', 'a•Cat: 1', NameType, UnknownTypeName);

});