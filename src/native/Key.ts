import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Key = new StructureDefinition(
    [],
    [ new Alias("Key", "eng") ],
    [],
    [],
    [
        parseBind(tokens("key•''")),
        parseBind(tokens("down•?"))
    ]
);

export default Key;