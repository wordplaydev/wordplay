import Step from './Step';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class Initialize extends Step {
    action?: (evaluator: Evaluator) => Value | undefined;

    constructor(
        node: Expression,
        action?: (evaluator: Evaluator) => Value | undefined
    ) {
        super(node);
        this.action = action;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

    getExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.Iteration.initialize)
        );
    }
}
