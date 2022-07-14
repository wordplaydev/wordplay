import { DuplicateAliases, IncompatibleBind, testConflict, UnusedBind } from "../parser/Conflict";
import Bind from "./Bind";

test("Test bind conflicts", () => {

    testConflict('a, b: 1\na', 'a, a: 1\na', Bind, DuplicateAliases);
    testConflict('a•#: 1\na', 'a•"": 1\na', Bind, IncompatibleBind);
    testConflict('a: 1\na+a', 'a: 1\n1+1', Bind, UnusedBind);

});