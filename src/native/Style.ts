import type StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import { Fonts, SupportedFonts, type FontWeight } from "./Fonts";

// Set the allowable font names to those in the supported fonts list.
const Style = parseStructure(tokens(
`•Style/eng,👗/😀(
    font/eng,🔡/😀•ø${SupportedFonts.map(font => `•"${font.name}"`).join("")}: ø
    size/eng,📏/😀•#pt•ø:ø
    weight/eng,${TRANSLATE}weight/😀•1•2•3•4•5•6•7•8•9•ø: ø
    italic/eng,${TRANSLATE}italic/😀•?: ⊥
)`)) as StructureDefinition;

export default Style;

export function styleToCSS(value: Value | undefined) {

    if(!(value instanceof Structure)) return undefined;
    const style = {
        size: value.getMeasurement("size"),
        font: value.getText("font"),
        weight: value.getMeasurement("weight"),
        italic: value.getBool("italic")
    }

    // Load the font if we haven't already.
    if(style?.font) Fonts.load({ name: style?.font, weight: (style?.weight ?? 4) * 100 as FontWeight, italic: style?.italic === true});

    return `${style?.size !== undefined ? `font-size: ${style?.size}pt;` : ""} ${style?.font !== undefined ? `font-family: "${style?.font}";` : ""} ${style?.weight !== undefined ? `font-weight: ${style?.weight * 100};` : ""} ${style?.italic === true ? `font-style: italic;` : ""}`;
    
}