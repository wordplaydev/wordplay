import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Verse = new StructureDefinition(
    [], // TODO Localized documentation
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("group•Group"))
    ],
    new Block([], [], true)
);

export default Verse;