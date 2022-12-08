import type Decimal from "decimal.js";
import toStructure from "../native/toStructure";
import { TRANSLATE } from "../nodes/Translations";
import type Value from "../runtime/Value";
import Output from "./Output";

export const TransitionType = toStructure(`
    •Transition/eng,${TRANSLATE}Transition/😀()
`);

export default abstract class Transition extends Output {

    readonly duration: Decimal;
    readonly delay: Decimal;

    constructor(value: Value, duration: Decimal, delay: Decimal) {
        super(value);

        this.duration = duration;
        this.delay = delay;

    }

    getDelay(): Decimal {
        return this.duration;
    }
 
    getDuration(): Decimal {
        return this.delay;
    }

}