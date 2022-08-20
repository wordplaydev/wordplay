import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Evaluable from "./Evaluable";
import type Value from "./Value";

export default class Action extends Step {

    action?: (evaluator: Evaluator) => Value | undefined;

    constructor(node: Evaluable, action?: (evaluator: Evaluator) => Value | undefined) {
        super(node);
        this.action = action;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

}