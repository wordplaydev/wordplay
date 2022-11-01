import { parseStructure, tokens } from "../parser/Parser";

const Phrase = parseStructure(tokens(
`•Phrase/eng,💬/😀(
    text/eng,✍︎/😀•"" 
    size/eng,📏/😀:12pt 
    font/eng,👚/😀•"":"Noto Sans" 
    in/eng,👍/😀•Transition•ø:ø 
    animate/eng,🔂/😀•Animation•ø:ø
)`));

export default Phrase;