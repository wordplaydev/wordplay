import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import { SupportedFonts } from "./Fonts";

// Set the allowable font names to those in the supported fonts list.
const Style = parseStructure(tokens(
`•Style/eng,👗/😀(
    font/eng,🔡/😀${SupportedFonts.map(font => `•"${font.name}"`).join("")}: "Noto Sans"
    weight/eng,${TRANSLATE}weight/😀•1•2•3•4•5•6•7•8•9: 4
    size/eng,📏/😀•#pt:12pt
    italic/eng,${TRANSLATE}italic/😀•?: ⊤
)`));

export default Style;