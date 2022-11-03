import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import { SupportedFonts } from "./Fonts";

// Set the allowable font names to those in the supported fonts list.
const Style = parseStructure(tokens(
`•Style/eng,👗/😀(
    font/eng,🔡/😀•ø${SupportedFonts.map(font => `•"${font.name}"`).join("")}: ø
    size/eng,📏/😀•#pt•ø:ø
    weight/eng,${TRANSLATE}weight/😀•1•2•3•4•5•6•7•8•9•ø: ø
    italic/eng,${TRANSLATE}italic/😀•?: ⊥
)`));

export default Style;