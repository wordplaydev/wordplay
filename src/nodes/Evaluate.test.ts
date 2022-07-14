import { IncompatibleInputs, NotAFunction, NotInstantiable, testConflict } from "../parser/Conflict";
import Evaluate from "./Evaluate";

test("Test evaluate conflicts", () => {

    testConflict('add: ƒ(a•# b•#) a + b\nadd(1 2)', 'add: ƒ(a•# b•#) a + b\nsum(1 2)', Evaluate, NotAFunction);
    testConflict('Cat: •() (add: ƒ(a•# b•#) a)\nCat()', 'Cat: •() (add: ƒ(a•# b•#) …)\nCat()', Evaluate, NotInstantiable);
    testConflict('Cat: •(a•#) ()\nCat(1)', 'Cat: •(a•#) ()\nCat("hi")', Evaluate, IncompatibleInputs);

});