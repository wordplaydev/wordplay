import Step from './Step';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import type Locales from '../locale/Locales';

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

    getExplanations(locales: Locales, evaluator: Evaluator) {
        return this.node.getStartExplanations(
            locales,
            evaluator.project.getNodeContext(this.node),
            evaluator
        );
    }
}

export function start(evaluator: Evaluator, expr: Expression) {
    // If this expression is constant and it has a latest value, don't evaluate.
    // Finish.finish() will return the latest value.
    if (
        !evaluator.isInPast() &&
        evaluator.project.isConstant(expr) &&
        evaluator.getLatestExpressionValue(expr)
    ) {
        // Ask the evaluator to jump past this start's corresponding finish.
        evaluator.jumpPast(expr);
    }

    return undefined;
}
