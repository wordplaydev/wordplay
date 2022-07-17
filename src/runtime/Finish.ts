import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import Step from "./Step";
import type Value from "./Value";

export default class Finish extends Step {

    constructor(node: Evaluable) {
        super(node);
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.node.evaluate(evaluator);
    }

}