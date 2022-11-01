import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";

const Group = parseStructure(tokens(
`•Group/eng,▣/😀(
    layout/eng,${TRANSLATE}layout/😀•Layout
    … phrases/eng,${TRANSLATE}phrases/😀•Phrase
)`));
export default Group;