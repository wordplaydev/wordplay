import Borrow from '@nodes/Borrow';
import Changed from '@nodes/Changed';
import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type Value from '@values/Value';
import Step from '@runtime/Step';

type Action = (evalutor: Evaluator) => Value | undefined;

export default class Start extends Step {
    readonly action?: Action | undefined;

    constructor(node: Expression, action?: Action) {
        super(node);
        this.action = action;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        const skipped = start(evaluator, this.node);
        // If we jumped past this expression to reuse its prior value, don't run the
        // action. Many actions start a new Evaluation (Block, Evaluate, Convert, ...),
        // which would evaluate the body we just skipped and push a second value —
        // corrupting the stack for the enclosing expression, which then pops the
        // wrong operands.
        if (skipped) return undefined;
        return this.action === undefined ? undefined : this.action(evaluator);
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
    // If this expression is 1) constant or not dependent on a reaction's streams and 2) it has a previously stored value, skip evaluating it.
    // Finish.finish() will return that stored value and process any side effects.
    // We check for ANY stored value (not filtered by current stepIndex), because Start and Finish must
    // agree on whether to skip — otherwise inner inputs get pushed onto the value stack but never popped,
    // corrupting later evaluations. shouldSkip already guarantees the expression is effectively constant in this context.
    if (shouldSkip(evaluator, expr) && hasStoredValue(evaluator, expr)) {
        // Ask the evaluator to jump past this start's corresponding finish.
        evaluator.jumpPast(expr);
        return true;
    }

    return false;
}

export function hasStoredValue(evaluator: Evaluator, expr: Expression) {
    const list = evaluator.values.get(expr);
    return list !== undefined && list.length > 0 && list[list.length - 1].value !== undefined;
}

export function getStoredValue(evaluator: Evaluator, expr: Expression) {
    const list = evaluator.values.get(expr);
    return list !== undefined && list.length > 0 ? list[list.length - 1].value : undefined;
}

export function shouldSkip(evaluator: Evaluator, expr: Expression) {
    return (
        // Never skip an internal expression
        !expr.isInternal() &&
        // Never skip a Changed expression, as they can always affect evaluation
        !(expr instanceof Changed) &&
        // Never skip a Borrow: its whole purpose is the side effect of binding the borrowed
        // source or share into the current evaluation, which is fresh on every reevaluation.
        // Skipping it leaves the borrowed names unbound and its Finish popping an empty stack.
        !(expr instanceof Borrow) &&
        // Never skip an expression dependent on a Changed expression, as they can always change based on a Changed expression.
        !evaluator.project.isChangedDependentExpression(expr) &&
        // Don't reevaluate constants
        (evaluator.project.isConstant(expr) ||
            // Don't reevaluate reactions that are not currently reacting
            (evaluator.isReacting() &&
                !evaluator.isEvaluatingReaction() &&
                !evaluator.isDependentOnReactingStream(expr)))
    );
}
