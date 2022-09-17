import type Evaluable from "./Evaluable";
import type Exception from "./Exception";
import Step from "./Step";
import type Value from "./Value";

export default class Halt extends Step {

    readonly exception: Exception;

    constructor(exception: Exception, node: Evaluable) {
        super(node);

        this.exception = exception;
    }
    
    evaluate(): Value {
        return this.exception;
    }

}