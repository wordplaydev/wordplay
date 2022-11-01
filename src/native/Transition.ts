import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";

export const Transition = parseStructure(tokens(`•Transition/eng,${TRANSLATE}Transition/😀()`));
export default Transition;

export const Fade = parseStructure(tokens(`•Fade/eng,🫥/😀 •Transition(duration/eng,${TRANSLATE}duration/😀•#ms:400ms delay/eng,${TRANSLATE}delay/😀•#ms:0ms)`));
export const Scale = parseStructure(tokens(`•Scale/eng,🫥/😀 •Transition(scale/eng,${TRANSLATE}scale/😀•#:2 duration/eng,${TRANSLATE}duration/😀•#ms:400ms delay/eng,${TRANSLATE}delay/😀•#ms:0ms)`));