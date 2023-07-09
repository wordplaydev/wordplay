import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Locale from '@locale/Locale';
import type Evaluable from '@nodes/Evaluable';
import concretize from '../locale/concretize';

export default class StartEvaluation extends Step {
    readonly evaluable: Evaluable;

    constructor(node: Evaluable) {
        super(node);
        this.evaluable = node;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.evaluable.startEvaluation(evaluator);
    }

    getExplanations(locale: Locale) {
        return concretize(locale, locale.evaluate.evaluate);
    }
}
