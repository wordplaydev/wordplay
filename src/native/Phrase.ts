import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Phrase = new StructureDefinition(
    [], // TODO Add documentation.
    [ new Alias("Phrase", new Language("eng")) ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("text/eng•''")),
        parseBind(tokens("size/eng•#pt:12pt")),
        parseBind(tokens("font/eng•'':'Noto Sans'"))
    ],
    new Block([], [], true)
);

export default Phrase;