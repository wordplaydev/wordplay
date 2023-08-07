import Node from '@nodes/Node';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import type Locale from '@locale/Locale';
import type Markup from '../nodes/Markup';

/** Represents one step a compiled program's execution. */
export default abstract class Step {
    /** The node that generated this step. */
    readonly node: Expression;

    constructor(node: Expression) {
        this.node = node;
    }

    abstract evaluate(evaluator: Evaluator): Value | undefined;

    abstract getExplanations(translation: Locale, evaluator: Evaluator): Markup;

    toString() {
        return `${this.constructor.name} (${this.node.constructor.name}) ${
            this.node instanceof Node
                ? this.node
                      .toWordplay()
                      .replaceAll(/^\s{2,}/g, ' ')
                      .trim()
                      .substring(0, 20)
                : ''
        }...`;
    }
}
