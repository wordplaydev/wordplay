import type Expression from '@nodes/Expression';
import type Locales from '@locale/Locales';
import type Evaluator from '@runtime/Evaluator';
import Step from '@runtime/Step';
import type Value from '@values/Value';

/**
 * Pushes a value the compiler already knows, for an expression that has no evaluation of its
 * own — a boolean input shorthand, whose ⊤ is implied by the name rather than written.
 *
 * Attributed to the node the creator actually wrote, so the debugger highlights and narrates
 * that node rather than the evaluation around it, and so hovering it shows the value.
 */
export default class Push extends Step {
    readonly value: Value;

    constructor(node: Expression, value: Value) {
        super(node);
        this.value = value;
    }

    evaluate(evaluator: Evaluator): Value {
        evaluator.rememberExpressionValue(this.node, this.value);
        return this.value;
    }

    getExplanations(locales: Locales, evaluator: Evaluator) {
        return this.node.getStartExplanations(
            locales,
            evaluator.project.getNodeContext(this.node),
            evaluator,
        );
    }
}
