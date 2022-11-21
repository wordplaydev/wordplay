import type StructureDefinition from "../nodes/StructureDefinition";
import { parseStructure, tokens } from "../parser/Parser";

const Phrase = parseStructure(tokens(
`•Phrase/eng,💬/😀(
    text/eng,✍︎/😀•""
    style/eng,👗/😀•Style•ø:ø
    in/eng,👍/😀•Transition•ø:ø 
    animate/eng,🔂/😀•Animation•ø:ø
)`)) as StructureDefinition;

export default Phrase;