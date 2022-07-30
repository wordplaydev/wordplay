import { testConflict, UnexpectedTypeVariable, UnknownName } from "../parser/Conflict";
import Name from "./Name";

test("Test name conflicts", () => {

    testConflict('a: 1\na', 'b: 1\na', Name, UnknownName);
    testConflict('ƒ(a b) a + b', 'ƒ(a b) a + c', Name, UnknownName, 1);
    testConflict('•(a b) (a + b)', '•(a b) (a + c)', Name, UnknownName, 1);
    testConflict('table: |a•#\ntable|- a = 0', 'table: |a•#\ntable|- b = 0', Name, UnknownName, 1);
    testConflict('ƒ•T(a) a + 2', 'ƒ•T() T + 1', Name, UnexpectedTypeVariable);

});