import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Verse = new StructureDefinition(
    [],
    [],
    [
        parseBind(false, tokens("group•Group''")),
    ],
    new Block([], [], true)
);

export default Verse;