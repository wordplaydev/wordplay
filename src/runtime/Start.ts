import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Value from "./Value";
import type Translations from "../nodes/Translations";
import type Expression from "../nodes/Expression";

export default class Start extends Step {

    action?: (evaluator: Evaluator) => Value | undefined;

    constructor(node: Expression, action?: (evaluator: Evaluator) => Value | undefined) {
        super(node);
        this.action = action;
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

    getExplanations(evaluator: Evaluator): Translations { return this.node.getStartExplanations(evaluator); }
    
}