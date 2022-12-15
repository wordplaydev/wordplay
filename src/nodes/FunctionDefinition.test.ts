import { test, expect } from "vitest";
import { testConflict } from "../conflicts/TestUtilities";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import RequiredAfterOptional from "../conflicts/RequiredAfterOptional";
import DuplicateTypeVariables from "../conflicts/DuplicateTypeVariables";
import FunctionDefinition from "./FunctionDefinition";
import DuplicateNames from "../conflicts/DuplicateNames";
import Names from "./Names";
import Docs from "./Docs";
import DuplicateBinds from "../conflicts/DuplicateBinds";
import TypeVariables from "./TypeVariables";
import Evaluator from "../runtime/Evaluator";
import EvaluationException from "../runtime/ContextException";
import NoExpression from "../conflicts/NoExpression";

test("Test function conflicts", () => {

    testConflict('`hi`/eng`hola`/spa ƒ() 1', '`hi`/eng`hola`/eng ƒ() 1', Docs, DuplicateLanguages);
    testConflict('ƒ x,y,z(a b) 1', 'ƒ x,x,x(a b) 1', Names, DuplicateNames);
    testConflict('ƒ(a b) 1', 'ƒ(a a) 1', FunctionDefinition, DuplicateBinds);
    testConflict('ƒ⸨T U⸩() 1', 'ƒ⸨T T⸩() 1', TypeVariables, DuplicateTypeVariables);
    testConflict('ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional);
    testConflict('ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional);
    testConflict('ƒ a() 1', 'ƒ a()', FunctionDefinition, NoExpression);

});

test("Test text functions", () => {
    expect(Evaluator.evaluateCode('ƒ a() a() a()')).toBeInstanceOf(EvaluationException);
})