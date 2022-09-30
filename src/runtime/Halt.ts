import type Translations from "../nodes/Translations";
import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import type Exception from "./Exception";
import Step from "./Step";
import type Value from "./Value";

export default class Halt extends Step {

    readonly exception: (evaluator: Evaluator) => Exception;

    constructor(exception: (evaluator: Evaluator) => Exception, node: Evaluable) {
        super(node);

        this.exception = exception;
    }
    
    evaluate(evaluator: Evaluator): Value {
        return this.exception(evaluator);
    }

    getExplanations(): Translations {
        return {
            "eng": `There was an exception, so the program had to stop.`
        }
    }

}