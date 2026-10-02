import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Locales from '#locale/Locales.ts';
import type Value from '#values/Value.ts';
import Step from '#runtime/Step.ts';
import ValueRef from '#locale/ValueRef.ts';
import { PROPERTY_SYMBOL } from '#parser/Symbols.ts';

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
        return locales.concretize((l) => l.node.Translate.next, {
            value: item
                ? new ValueRef(item, locales, evaluator.getCurrentContext())
                : undefined,
        });
    }
}
