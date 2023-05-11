import Node from '@nodes/Node';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Locale from '@translation/Locale';
import type { Description } from '@translation/Locale';

/** Represents one step a compiled program's execution. */
export default abstract class Step {
    /** The node that generated this step. */
    readonly node: Expression;

    constructor(node: Expression) {
        this.node = node;
    }

    abstract evaluate(evaluator: Evaluator): Value | undefined;

    abstract getExplanations(
        translation: Locale,
        evaluator: Evaluator
    ): Description;

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
