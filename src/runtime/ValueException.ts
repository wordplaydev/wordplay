import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export default class UnparasableException extends Exception {

    constructor(evaluator: Evaluator) {
        super(evaluator);

    }

    getExplanations() {
        return {
            "eng": `Expected a value on the stack while implementing ${this.step?.node.toWordplay()}, but there wasn't one.`
        }
    };

}