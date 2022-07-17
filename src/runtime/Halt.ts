import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import type Exception from "./Exception";
import Step from "./Step";
import type Value from "./Value";

export default class Halt extends Step {

    readonly exception: Exception;

    constructor(exception: Exception, node: Evaluable) {
        super(node);

        this.exception = exception;
    }
    
    evaluate(evaluator: Evaluator): Value {
        return this.exception;
    }

}