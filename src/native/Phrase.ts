import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Phrase = new StructureDefinition(
    [],
    [ new Alias("Phrase", "eng") ],
    [],
    [],
    [
        parseBind(tokens("text/eng•''")),
        parseBind(tokens("size/eng•#pt:12pt")),
        parseBind(tokens("font/eng•'':'Noto Sans'"))
    ]
);

export default Phrase;