import type Evaluate from "../nodes/Evaluate";
import Conflict from "./Conflict";


export class NotInstantiable extends Conflict {
    readonly evaluate: Evaluate;
    constructor(evaluate: Evaluate) {
        super(false);
        this.evaluate = evaluate;
    }
}
