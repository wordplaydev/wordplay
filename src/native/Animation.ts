import { TRANSLATE } from "../nodes/Translations";
import { parseStructure, tokens } from "../parser/Parser";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";

export const AnimationType = parseStructure(tokens(`•Animation/eng,${TRANSLATE}Animation/😀()`))
export default AnimationType;

export class Animation {

    readonly type: typeof Wobble | typeof Throb | typeof Bounce | undefined;
    readonly duration: number | undefined = undefined;
    readonly count: number | undefined = undefined;

    constructor(structure: Value | undefined) {

        if(structure instanceof Structure) {
            this.type = structure instanceof Structure ? 
                (structure?.type === Wobble ? Wobble : structure?.type === Throb ? Throb : structure?.type === Bounce ? Bounce : undefined) : 
                undefined;
            this.duration = structure.getMeasurement("duration");
            this.count = structure.getMeasurement("count");
        }

    }
}

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