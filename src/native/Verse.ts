import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";

const Verse = parseStructure(tokens(`
•Verse/eng,🌎/😀(
    group/eng,${TRANSLATE}group/😀•Group
    font/eng,${TRANSLATE}font/😀•"": "Noto Sans"
    size/eng,${TRANSLATE}size/😀•#pt: 12pt
)`
));

export default Verse;