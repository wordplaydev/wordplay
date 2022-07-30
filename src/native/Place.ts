import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Place = new StructureDefinition(
    [], // TODO Localized documentation
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("x•#px")),
        parseBind(false, tokens("y•#px"))
    ],
    new Block([], [], true)
);

export default Place;