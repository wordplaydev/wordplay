import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Translation from '@translation/Translation';
import type Evaluable from '@nodes/Evaluable';

export default class StartEvaluation extends Step {
    readonly evaluable: Evaluable;

    constructor(node: Evaluable) {
        super(node);
        this.evaluable = node;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.evaluable.startEvaluation(evaluator);
    }

    getExplanations(translation: Translation) {
        return translation.step.evaluate;
    }
}
