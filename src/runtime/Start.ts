import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Evaluable from "./Evaluable";
import type Value from "./Value";

export default class Start extends Step {

    action?: (evaluator: Evaluator) => void;

    constructor(node: Evaluable, action?: (evalulator: Evaluator) => void) {
        super(node);
        this.action = action;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        this.action?.call(undefined, evaluator);
        return undefined;
    }

}