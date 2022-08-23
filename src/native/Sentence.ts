import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Sentence = new StructureDefinition(
    [], // TODO Add documentation.
    [ new Alias("Sentence", new Language("eng")) ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("text/eng•''")),
        parseBind(true, tokens("size/eng•#pt:12pt")),
        parseBind(true, tokens("font/eng•'':'Noto Sans'"))
    ],
    new Block([], [], true)
);

export default Sentence;