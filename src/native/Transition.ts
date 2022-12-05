import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";

export const TransitionType = parseStructure(tokens(`•Transition/eng,${TRANSLATE}Transition/😀()`));
export default TransitionType;

export class Transition {

    readonly type: typeof Fade | typeof Scale | undefined;
    readonly duration: number | undefined = undefined;
    readonly delay: number | undefined = undefined;

    constructor(structure: Value | undefined) {

        if(structure instanceof Structure) {
            this.type = structure instanceof Structure ? 
                (structure?.type === Fade ? Fade : structure?.type === Scale ? Scale : undefined) : 
                undefined;
            this.duration = structure.getMeasurement("duration");
            this.delay = structure.getMeasurement("delay");
        }

    }
}

export const Fade = parseStructure(tokens(`•Fade/eng,🫥/😀 •Transition(duration/eng,${TRANSLATE}duration/😀•#ms:400ms delay/eng,${TRANSLATE}delay/😀•#ms:0ms)`));
export const Scale = parseStructure(tokens(`•Scale/eng,🫥/😀 •Transition(scale/eng,${TRANSLATE}scale/😀•#:2 duration/eng,${TRANSLATE}duration/😀•#ms:400ms delay/eng,${TRANSLATE}delay/😀•#ms:0ms)`));