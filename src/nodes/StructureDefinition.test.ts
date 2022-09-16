import { testConflict } from "../conflicts/TestUtilities";
import { DuplicateLanguages } from "../conflicts/DuplicateLanguages";
import { RequiredAfterOptional } from "../conflicts/RequiredAfterOptional";
import { DuplicateTypeVariables } from "../conflicts/DuplicateTypeVariables";
import { DuplicateInputNames } from "../conflicts/DuplicateInputNames";
import StructureDefinition from "./StructureDefinition";

test("Test custom type conflicts", () => {

    testConflict('a:1\n`hi`/eng`hola`/spa•Hi()', 'a:1\n`hi`/eng`hola`/eng•Hi() ', StructureDefinition, DuplicateLanguages);
    testConflict('•Cat(a b)', '•Cat(a a)', StructureDefinition, DuplicateInputNames);
    testConflict('•Cat ∘T∘U ()', '•Cat ∘T∘T ()', StructureDefinition, DuplicateTypeVariables);
    testConflict('•Cat(a•# b•#:1)', '•Cat(a•#:1 b•#)', StructureDefinition, RequiredAfterOptional);

});