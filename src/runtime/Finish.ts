import type Translations from '../nodes/Translations';
import type Evaluator from './Evaluator';
import Step from './Step';
import type Value from './Value';
import type Expression from '../nodes/Expression';
import HOF from '../native/HOF';

export default class Finish extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return finish(evaluator, this.node);
    }

    getExplanations(evaluator: Evaluator): Translations {
        return this.node.getFinishExplanations(evaluator);
    }
}

export function finish(evaluator: Evaluator, expr: Expression) {
    // Find which execution this is.
    const count = evaluator.getCount(expr);
    const priorValue =
        count === undefined
            ? undefined
            : evaluator.getLatestValueOf(expr, count);

    // If this node is invalidated, just evaluate it, remember it's value, and return it's value.
    if (
        expr instanceof HOF ||
        evaluator.isInvalidated(expr) ||
        priorValue === undefined
    ) {
        // Finish evaluating this node.
        const value = expr.evaluate(evaluator, undefined);

        // Notify the evaluator that we finished this evaluation.
        evaluator.finishExpression(expr, false, value);

        return value;
    }
    // Otherwise, get the value from the previous evaluation
    else {
        // Evaluate any side effects
        const newValue = expr.evaluate(evaluator, priorValue);

        // Notify the evaluator that we finished this evaluation.
        evaluator.finishExpression(expr, true);

        // Return the prior value.
        return newValue;
    }
}
