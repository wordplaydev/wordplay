import { testConflict, UnknownTypeName } from "../parser/Conflict";
import NameType from "./NameType";

test("Test name type conflicts", () => {

    testConflict('•Cat() ()\na•Cat: Cat()', 'a•Cat: 1', NameType, UnknownTypeName);

});