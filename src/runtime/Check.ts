import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Locale from '@translation/Locale';

export default class Check extends Step {
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

    getExplanations(translation: Locale) {
        return translation.step.check;
    }
}
