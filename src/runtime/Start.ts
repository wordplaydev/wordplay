import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Expression from '../nodes/Expression';
import HOF from '../native/HOF';
import type Translation from '../translations/Translation';

type Action = (evalutor: Evaluator) => Value | undefined;

export default class Start extends Step {
    readonly action?: Action;

    constructor(node: Expression, action?: Action) {
        super(node);
        this.action = action;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const value = start(evaluator, this.node);
        return this.action === undefined ? value : this.action(evaluator);
    }

    getExplanations(translation: Translation, evaluator: Evaluator) {
        return this.node.getStartExplanations(
            translation,
            evaluator.project.getNodeContext(this.node),
            evaluator
        );
    }
}

export function start(evaluator: Evaluator, expr: Expression) {
    // Notify that evaluation is starting.
    const count = evaluator.startExpression(expr);

    // If this node wasn't invalidated and there's a prior value for it, return the prevously evaluated value and jump over the evaluation steps.
    if (
        !(expr instanceof HOF) &&
        !evaluator.isInvalidated(expr) &&
        count !== undefined &&
        evaluator.getLatestValueOf(expr, count)
    ) {
        // Ask the evaluator to jump past this start's corresponding finish.
        evaluator.jumpPast(expr);
    }

    return undefined;
}
