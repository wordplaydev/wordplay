import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Evaluable from "./Evaluable";
import type Value from "./Value";

export default class Start extends Step {

    constructor(node: Evaluable) {
        super(node);
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return undefined;
    }

}