import { DuplicateLanguages, DuplicateInputNames, testConflict, DuplicateTypeVariables, RequiredAfterOptional } from "../parser/Conflict";
import StructureDefinition from "./StructureDefinition";

test("Test custom type conflicts", () => {

    testConflict('a:1\n`hi`eng`hola`spa•() ()', 'a:1\n`hi`eng`hola`eng•() ()', StructureDefinition, DuplicateLanguages);
    testConflict('Cat: •(a b) ()', 'Cat: •(a a) ()', StructureDefinition, DuplicateInputNames);
    testConflict('Cat: ••T•U() ()', 'Cat: ••T•T() ()', StructureDefinition, DuplicateTypeVariables);
    testConflict('Cat: •(a•# b•#:1) ()', 'Cat: •(a•#:1 b•#) ()', StructureDefinition, RequiredAfterOptional);

});