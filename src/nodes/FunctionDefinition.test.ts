import { DuplicateLanguages, DuplicateInputNames, testConflict, DuplicateTypeVariables, RequiredAfterOptional } from "../parser/Conflict";
import FunctionDefinition from "./FunctionDefinition";

test("Test function conflicts", () => {

    testConflict('a:1\n`hi`/eng`hola`/spa ƒ() 1', 'a:1\n`hi`/eng`hola`/eng ƒ() 1', FunctionDefinition, DuplicateLanguages);
    testConflict('ƒ(a b) 1', 'ƒ(a a) 1', FunctionDefinition, DuplicateInputNames);
    testConflict('ƒ•T•U() 1', 'ƒ•T•T() 1', FunctionDefinition, DuplicateTypeVariables);
    testConflict('ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional);

});