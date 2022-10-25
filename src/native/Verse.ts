import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Verse = new StructureDefinition(
    [],
    [ new Alias("Verse", "eng") ],
    [],
    [],
    [
        parseBind(tokens("group•Group")),
        parseBind(tokens("font•'':'Noto Sans'")),
        parseBind(tokens("size•#pt: 12pt"))
    ]
);

export default Verse;