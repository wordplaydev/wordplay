import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export default class UnparseableException extends Exception {

    constructor(evaluator: Evaluator) {
        super(evaluator);

    }

    getExplanations() {
        return {
            "eng": `Expected a value on the stack after executing ${this.step?.node.toWordplay()}, but there wasn't one.`
        }
    };

}