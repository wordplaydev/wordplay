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

    // Notify the evaluator that we finished this evaluation.
    evaluator.saveExpressionValue(expr, value);

    return value;
}
