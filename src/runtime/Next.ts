import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '../locale/Locales';
import type Value from '../values/Value';
import Step from './Step';

export default class Next extends Step {
    action: (evaluator: Evaluator) => Value | undefined;

    constructor(
        node: Expression,
        action: (evaluator: Evaluator) => Value | undefined,
    ) {
        super(node);
        this.action = action;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Iteration.next);
    }
}
