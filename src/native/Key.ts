import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Key = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Key", "eng") ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("key•''")),
        parseBind(tokens("down•?"))
    ]
);

export default Key;