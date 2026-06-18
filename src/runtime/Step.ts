import type Expression from '@nodes/Expression';
import Node from '@nodes/Node';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';
import type Value from '@values/Value';

/** Represents one step a compiled program's execution. */
export default abstract class Step {
    /** The node that generated this step. */
    readonly node: Expression;

    constructor(node: Expression) {
        this.node = node;
    }

    abstract evaluate(evaluator: Evaluator): Value | undefined;

    abstract getExplanations(locales: Locales, evaluator: Evaluator): Markup;

    /**
     * The node this step is actively working on right now, when that differs
     * from the static {@link node} that compiled it. A looping step that drives
     * a sub-process (e.g. the pattern matcher, which walks many source nodes
     * from one compiled step) overrides this so the editor highlights and
     * narrates the construct currently being tried. Returns undefined by
     * default, meaning "use {@link node}".
     */
    getActiveNode(_evaluator: Evaluator): Node | undefined {
        return undefined;
    }

    toString() {
        return `${this.constructor.name} (${this.node.getDescriptor()}) ${
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
