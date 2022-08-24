import Alias from "../nodes/Alias";
import Block from "../nodes/Block";
import Language from "../nodes/Language";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Group = new StructureDefinition(
    [], // TODO Add documentation.
    [ new Alias("Group", new Language("eng")) ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(false, tokens("layout/eng•Layout")),
        parseBind(false, tokens("…sentences/eng•Sentence"))
    ],
    new Block([], [], true)
);

export default Group;