import { testConflict } from "../conflicts/testConflict";
import { UnexpectedTypeVariable } from "../conflicts/UnexpectedTypeVariable";
import { UnknownName } from "../conflicts/UnknownName";
import Name from "./Name";

test("Test name conflicts", () => {

    testConflict('a: 1\na', 'b: 1\na', Name, UnknownName);
    testConflict('ƒ(a b) a + b', 'ƒ(a b) a + c', Name, UnknownName, 1);
    testConflict('•Math(a b) (z: a + b)', '•Math(a b) (z: a + c)', Name, UnknownName, 1);
    testConflict('table: |a•#\ntable|- a = 0', 'table: |a•#\ntable|- b = 0', Name, UnknownName, 1);
    testConflict('ƒ•T(a) a + 2', 'ƒ•T() T + 1', Name, UnexpectedTypeVariable);

});