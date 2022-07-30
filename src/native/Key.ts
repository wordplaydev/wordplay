import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Key = new StructureDefinition(
    [], // TODO Localized documentation
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("key•''")),
        parseBind(false, tokens("down•?"))
    ],
    new Block([], [], true)
);

export default Key;