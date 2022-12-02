import Step from "./Step";
import type Evaluator from "./Evaluator";
import type Value from "./Value";
import type Translations from "../nodes/Translations";
import type Expression from "../nodes/Expression";
import HOF from "../native/HOF";

export default class Start extends Step {

    constructor(node: Expression) {
        super(node);
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {
        return start(evaluator, this.node);
    }

    getExplanations(evaluator: Evaluator): Translations { return this.node.getStartExplanations(evaluator); }
    
}

export function start(evaluator: Evaluator, expr: Expression) {

    // Notify that evaluation is starting.
    const count = evaluator.startEvaluating(expr);

    // If this node wasn't invalidated and there's a prior value for it, return the prevously evaluated value and jump over the evaluation steps.
    if(!(expr instanceof HOF) && !evaluator.isInvalidated(expr) && count !== undefined && evaluator.getPriorValueOf(expr, count)) {
        // Ask the evaluator to jump past this start's corresponding finish.
        evaluator.jumpPast(expr);
    }

    return undefined;
    
}