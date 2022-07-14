import { DuplicateLanguages, DuplicateInputNames, testConflict, DuplicateTypeVariables, RequiredAfterOptional } from "../parser/Conflict";
import CustomType from "./CustomType";

test("Test custom type conflicts", () => {

    testConflict('a:1\n`hi`eng`hola`spa•() ()', 'a:1\n`hi`eng`hola`eng•() ()', CustomType, DuplicateLanguages);
    testConflict('Cat: •(a b) ()', 'Cat: •(a a) ()', CustomType, DuplicateInputNames);
    testConflict('Cat: ••T•U() ()', 'Cat: ••T•T() ()', CustomType, DuplicateTypeVariables);
    testConflict('Cat: •(a•# b•#:1) ()', 'Cat: •(a•#:1 b•#) ()', CustomType, RequiredAfterOptional);

});