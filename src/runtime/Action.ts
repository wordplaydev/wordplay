import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Evaluable from "./Evaluable";
import type Value from "./Value";
import type Explanations from "../nodes/Explanations";

export default class Action extends Step {

    action?: (evaluator: Evaluator) => Value | undefined;
    explanations: Explanations;

    constructor(node: Evaluable, explanations: Explanations, action?: (evaluator: Evaluator) => Value | undefined) {
        super(node);
        this.action = action;
        this.explanations = explanations;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

    getExplanations(): Explanations { return this.explanations; }
    
}