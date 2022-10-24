import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Phrase = new StructureDefinition(
    [], // TODO Add documentation.
    [ new Alias("Phrase", "eng") ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("text/eng•''")),
        parseBind(tokens("size/eng•#pt:12pt")),
        parseBind(tokens("font/eng•'':'Noto Sans'"))
    ]
);

export default Phrase;