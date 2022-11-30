import type Translations from "../nodes/Translations";
import type Evaluator from "./Evaluator";
import Step from "./Step";
import type Value from "./Value";
import type Expression from "../nodes/Expression";
import HOF from "../native/HOF";

export default class Finish extends Step {

    constructor(node: Expression) {
        super(node);
    }
    
    evaluate(evaluator: Evaluator): Value | undefined {

        // Find which execution this is.
        const count = evaluator.getCount(this.node);
        const priorValue = count === undefined ? undefined : evaluator.getPriorValueOf(this.node, count)

        // If this node is invalidated, just evaluate it, remember it's value, and return it's value.
        if(this.node instanceof HOF || evaluator.isInvalidated(this.node) || priorValue === undefined) {
            // Finish evaluating this node.
            const value = this.node.evaluate(evaluator, undefined);

            // Notify the evaluator that we finished this evaluation.
            evaluator.finishEvaluating(this.node, false, value);

            return value;

        }
        // Otherwise, get the value from the previous evaluation
        else {

            // Evaluate any side effects
            const newValue = this.node.evaluate(evaluator, priorValue);

            // Notify the evaluator that we finished this evaluation.
            evaluator.finishEvaluating(this.node, true);

            // Return the prior value.
            return newValue;

        }
    }

    getExplanations(evaluator: Evaluator): Translations { 
        return this.node.getFinishExplanations(evaluator);
    }

}