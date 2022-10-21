import { test } from "vitest";
import { testConflict } from "../conflicts/TestUtilities";
import DuplicateLanguages from "../conflicts/DuplicateLanguages";
import RequiredAfterOptional from "../conflicts/RequiredAfterOptional";
import DuplicateTypeVariables from "../conflicts/DuplicateTypeVariables";
import FunctionDefinition from "./FunctionDefinition";
import DuplicateAliases from "../conflicts/DuplicateAliases";

test("Test function conflicts", () => {

    testConflict('a:1\n`hi`/eng`hola`/spa ƒ() 1', 'a:1\n`hi`/eng`hola`/eng ƒ() 1', FunctionDefinition, DuplicateLanguages);
    testConflict('ƒ x,y,z(a b) 1', 'ƒ x,x,x(a b) 1', FunctionDefinition, DuplicateAliases);
    testConflict('ƒ(a b) 1', 'ƒ(a a) 1', FunctionDefinition, DuplicateAliases);
    testConflict('ƒ∘T∘U() 1', 'ƒ∘T∘T() 1', FunctionDefinition, DuplicateTypeVariables);
    testConflict('ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional);

});