import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Evaluable from "./Evaluable";
import type Value from "./Value";
import type Translations from "../nodes/Translations";

export default class Start extends Step {

    action?: (evaluator: Evaluator) => Value | undefined;

    constructor(node: Evaluable, action?: (evaluator: Evaluator) => Value | undefined) {
        super(node);
        this.action = action;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

    getExplanations(evaluator: Evaluator): Translations { return this.node.getStartExplanations(evaluator); }
    
}