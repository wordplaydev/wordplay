import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";

const Verse = parseStructure(tokens(`
•Verse/eng,🌎/😀(
    group/eng,${TRANSLATE}group/😀•Group
    style/eng,${TRANSLATE}style/😀•Style: Style("Noto Sans" 12pt)
)`
));

export default Verse;