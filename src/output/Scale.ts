import Decimal from "decimal.js";
import toStructure from "../native/toStructure";
import { TRANSLATE } from "../nodes/Translations";
import type Value from "../runtime/Value";
import Transition from "./Transition";

export const ScaleType = toStructure(`
    •Scale/eng,🫥/😀•Transition(
        scale/eng,${TRANSLATE}scale/😀•#:2 
        duration/eng,${TRANSLATE}duration/😀•#ms:400ms 
        delay/eng,${TRANSLATE}delay/😀•#ms:0ms)
`);

export default class Fade extends Transition {

    constructor(value: Value, duration: Decimal = new Decimal(250), delay: Decimal = new Decimal(0)) {
        super(value, duration, delay);

    }

}