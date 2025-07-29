import Changed from '@nodes/Changed';
import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '../locale/Locales';
import type Value from '../values/Value';
import Step from './Step';

type Action = (evalutor: Evaluator) => Value | undefined;

export default class Start extends Step {
    readonly action?: Action | undefined;

    constructor(node: Expression, action?: Action) {
        super(node);
        this.action = action;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const value = start(evaluator, this.node);
        return this.action === undefined ? value : this.action(evaluator);
    }

    getExplanations(locales: Locales, evaluator: Evaluator) {
        return this.node.getStartExplanations(
            locales,
            evaluator.project.getNodeContext(this.node),
            evaluator,
        );
    }
}

export function start(evaluator: Evaluator, expr: Expression) {
    // This expression should be identical to that in Finish.finish().
    // If this expression is 1) constant or not dependent on a reaction's streams and 2) it has a latest value, skip evaluating it.
    // Finish.finish() will return the latest value and process any side effects.
    if (
        shouldSkip(evaluator, expr) &&
        evaluator.getLatestExpressionValue(expr)
    ) {
        // Ask the evaluator to jump past this start's corresponding finish.
        evaluator.jumpPast(expr);
    }

    return undefined;
}

export function shouldSkip(evaluator: Evaluator, expr: Expression) {
    return (
        !expr.isInternal() &&
        // Never skip a Changed expression, they always need to be evaluated.
        !(expr instanceof Changed) &&
        // Don't reevaluate constants
        (evaluator.project.isConstant(expr) ||
            // Don't reevaluate reactions that are not currently reacting
            (evaluator.isReacting() &&
                !evaluator.isEvaluatingReaction() &&
                !evaluator.isDependentOnReactingStream(expr)))
    );
}
