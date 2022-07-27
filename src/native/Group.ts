import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Group = new StructureDefinition(
    [],
    [],
    [
        parseBind(false, tokens("layout•Layout"))
    ],
    new Block([], [], true)
);

export default Group;