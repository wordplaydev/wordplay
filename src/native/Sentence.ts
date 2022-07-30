import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Sentence = new StructureDefinition(
    [], // TODO Add documentation.
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("text•''")),
        parseBind(false, tokens("size•#pt=12pt")),
        parseBind(false, tokens("font•''='Noto Sans'"))
    ],
    new Block([], [], true)
);

export default Sentence;