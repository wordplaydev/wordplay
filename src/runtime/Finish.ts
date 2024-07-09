import type Evaluator from '@runtime/Evaluator';
import Step from './Step';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import type Locales from '../locale/Locales';
import { shouldSkip } from './Start';

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
            evaluator,
        );
    }
}

export function finish(evaluator: Evaluator, expr: Expression) {
    // Not in the past and the expression is either constant or not dependent on recenlty changed streams? Reuse the prior value.
    if (shouldSkip(evaluator, expr)) {
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
