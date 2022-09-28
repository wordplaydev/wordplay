import Alias from "../nodes/Alias";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Key = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Key", new Language("eng")) ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("key•''")),
        parseBind(tokens("down•?"))
    ]
);

export default Key;