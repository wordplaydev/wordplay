import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";

export const Animation = parseStructure(tokens(`•Animation/eng,${TRANSLATE}Animation/😀()`))
export default Animation;

export const Wobble = parseStructure(tokens(
`•Wobble/eng,😵‍💫/😀 •Animation(
    angle/eng,${TRANSLATE}angle/😀•#°:10°
    duration/eng,${TRANSLATE}duration/😀•#ms:400ms
    count/eng,${TRANSLATE}count/😀•#:∞
)`
));

export const Throb = parseStructure(tokens(
`•Throb/eng,${TRANSLATE}Throb/😀 •Animation(
    scale/eng,${TRANSLATE}scale/😀•#:1.2
    duration/eng,${TRANSLATE}duration/😀•#ms:400ms
    count/eng,${TRANSLATE}count/😀•#:∞
)`
));

export const Bounce = parseStructure(tokens(
`•Bounce/eng,${TRANSLATE}Bounce/😀 •Animation(
    height/eng,${TRANSLATE}height/😀•#m:10m
    duration/eng,${TRANSLATE}duration/😀•#ms:400ms
    count/eng,${TRANSLATE}count/😀•#:∞
)`
));