import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Place = new StructureDefinition(
    [],
    [ new Alias("Place", "eng") ],
    [],
    [],
    [
        parseBind(tokens("x•#px")),
        parseBind(tokens("y•#px"))
    ]
);

export default Place;