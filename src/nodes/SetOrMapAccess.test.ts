import { testConflict } from "../conflicts/testConflict";
import { IncompatibleKey } from "../conflicts/IncompatibleKey";
import Evaluator from "../runtime/Evaluator";
import SetOrMapAccess from "./SetOrMapAccess";

test("Test set access conflicts", () => {

    testConflict('{1:1 2:2 3:3}{1}', '{1:1 2:2 3:3}{"hi"}', SetOrMapAccess, IncompatibleKey);
    
});

test("Test set and map access evaluation", () => {

    expect(Evaluator.evaluateCode("{1 2 3}{2}")?.toString()).toBe('⊤');
    expect(Evaluator.evaluateCode("{1:'a' 2:'b' 3:'c'}{2}")?.toString()).toBe('"b"');

});