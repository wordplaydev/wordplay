import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

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

    getExplanations(locale: Locale) {
        return concretize(locale, locale.node.HOF.initialize);
    }
}
