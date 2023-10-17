import type Evaluator from '@runtime/Evaluator';
import Step from './Step';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import type Locales from '../locale/Locales';

export default class Finish extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return finish(evaluator, this.node);
    }

    getExplanations(locales: Locales, evaluator: Evaluator) {
        return this.node.getFinishExplanations(
            locales,
            evaluator.project.getNodeContext(this.node),
            evaluator
        );
    }
}

export function finish(evaluator: Evaluator, expr: Expression) {
    // If there's a prior value and we're either in the past or this is constant, reuse the value.
    if (!evaluator.isInPast() && evaluator.project.isConstant(expr)) {
        const priorValue = evaluator.getLatestExpressionValue(expr);
        if (priorValue !== undefined) {
            // Evaluate any side effects
            return expr.evaluate(evaluator, priorValue);
        }
    }
    // Otherwise, finish evaluating.
    const value = expr.evaluate(evaluator, undefined);

    // Ask the evaluator to remember the value we computed.
    evaluator.rememberExpressionValue(expr, value);

    return value;
}
