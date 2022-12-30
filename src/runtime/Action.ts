import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Translations from '../nodes/Translations';
import type Expression from '../nodes/Expression';

export default class Action extends Step {
    action?: (evaluator: Evaluator) => Value | undefined;
    explanations: Translations;

    constructor(
        node: Expression,
        explanations: Translations,
        action?: (evaluator: Evaluator) => Value | undefined
    ) {
        super(node);
        this.action = action;
        this.explanations = explanations;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.action?.call(undefined, evaluator);
    }

    getExplanations(): Translations {
        return this.explanations;
    }
}
