import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Place = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Place", new Language("eng")) ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("x•#px")),
        parseBind(tokens("y•#px"))
    ],
    new Block([], [], true)
);

export default Place;