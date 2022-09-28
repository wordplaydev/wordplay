import Alias from "../nodes/Alias";
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
    ]
);

export default Place;