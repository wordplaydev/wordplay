import { parseStructure, tokens } from "../parser/Parser";

const Phrase = parseStructure(tokens(
`•Phrase/eng,💬/😀(
    text/eng,✍︎/😀•""
    style/eng,👗/😀•Style: Style()
    in/eng,👍/😀•Transition•ø:ø 
    animate/eng,🔂/😀•Animation•ø:ø
)`));

export default Phrase;