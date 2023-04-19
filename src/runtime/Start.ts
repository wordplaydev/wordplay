import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Translation from '@translation/Translation';

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
    evaluator.startExpression(expr);

    // If this expression is constant and it has a latest value, don't evaluate.
    // Finish.finish() will return the latest value.
    if (
        !evaluator.isInPast() &&
        evaluator.project.isConstant(expr) &&
        evaluator.getLatestValueOf(expr, evaluator.getStepIndex())
    ) {
        // Ask the evaluator to jump past this start's corresponding finish.
        evaluator.jumpPast(expr);
    }

    return undefined;
}
