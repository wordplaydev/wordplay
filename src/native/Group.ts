import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Group = new StructureDefinition(
    [], // TODO Add documentation.
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("layout•Layout")),
        parseBind(false, tokens("…sentences•Sentence"))
    ],
    new Block([], [], true)
);

export default Group;