import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Verse = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Verse", "eng") ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("group•Group")),
        parseBind(tokens("font•'':'Noto Sans'")),
        parseBind(tokens("size•#pt: 12pt"))
    ]
);

export default Verse;