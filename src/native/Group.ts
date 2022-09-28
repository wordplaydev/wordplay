import Alias from "../nodes/Alias";
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
        parseBind(tokens("layout/eng•Layout")),
        parseBind(tokens("…phrases/eng•Phrase"))
    ]
);

export default Group;