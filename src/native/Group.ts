import Alias from "../nodes/Alias";
import StructureDefinition from "../nodes/StructureDefinition";
import { parseBind, tokens } from "../parser/Parser";

const Group = new StructureDefinition(
    [], // TODO Add documentation.
    [ new Alias("Group", "eng") ],
    [],
    [],
    [
        // TODO Localize names, add documentation.
        parseBind(tokens("layout/eng•Layout")),
        parseBind(tokens("…phrases/eng•Phrase"))
    ]
);

export default Group;