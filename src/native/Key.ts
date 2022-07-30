import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Key = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Key", new Language("eng")) ],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("key•''")),
        parseBind(false, tokens("down•?"))
    ],
    new Block([], [], true)
);

export default Key;