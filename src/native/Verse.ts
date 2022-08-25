import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Verse = new StructureDefinition(
    [], // TODO Localized documentation
    [ new Alias("Verse", new Language("eng")) ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("group•Group")),
        parseBind(tokens("font•'':'Noto Sans'")),
        parseBind(tokens("size•#pt: 12pt"))
    ],
    new Block([], [], true)
);

export default Verse;