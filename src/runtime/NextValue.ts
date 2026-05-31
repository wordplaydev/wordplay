import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type Value from '@values/Value';
import Step from '@runtime/Step';
import ValueRef from '@locale/ValueRef';
import { PROPERTY_SYMBOL } from '@parser/Symbols';

/**
 * The per-item step of a translate (↦): binds `.` to the next item (or jumps to
 * the finish when the collection is exhausted) and explains "next value, $value".
 */
export default class NextValue extends Step {
    readonly action: (evaluator: Evaluator) => Value | undefined;

    constructor(
        node: Expression,
        action: (evaluator: Evaluator) => Value | undefined,
    ) {
        super(node);
        this.action = action;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action(evaluator);
    }

    getExplanations(locales: Locales, evaluator: Evaluator) {
        const item = evaluator.resolve(PROPERTY_SYMBOL);
        return locales.concretize(
            (l) => l.node.Translate.next,
            {
                value: item
                    ? new ValueRef(item, locales, evaluator.getCurrentContext())
                    : undefined,
            },
        );
    }
}
