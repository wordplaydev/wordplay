import type Evaluator from './Evaluator';
import Step from './Step';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Translation from '@translation/Translation';

export default class Finish extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return finish(evaluator, this.node);
    }

    getExplanations(translation: Translation, evaluator: Evaluator) {
        return this.node.getFinishExplanations(
            translation,
            evaluator.project.getNodeContext(this.node),
            evaluator
        );
    }
}

export function finish(evaluator: Evaluator, expr: Expression) {
    // Find which execution this is.
    const count = evaluator.getCount(expr);

    // Get the prior value computed for this expression.
    const priorValue =
        count === undefined
            ? undefined
            : evaluator.getLatestValueOf(expr, count);

    // If there's a prior value and we're either in the past or this is constant, reuse the value.
    if (
        priorValue !== undefined &&
        !evaluator.isInPast() &&
        evaluator.project.isConstant(expr)
    ) {
        // Evaluate any side effects
        const value = expr.evaluate(evaluator, priorValue);

        // Notify the evaluator that we finished this evaluation.
        evaluator.finishExpression(expr, priorValue);

        // Return the prior value.
        return value;
    }
    // Otherwise, finish evaluating.
    else {
        // Finish evaluating this node.
        const value = expr.evaluate(evaluator, undefined);

        // Notify the evaluator that we finished this evaluation.
        evaluator.finishExpression(expr, value);

        return value;
    }
}
