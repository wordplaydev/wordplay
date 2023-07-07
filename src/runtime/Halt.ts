import type Evaluator from './Evaluator';
import type Exception from './Exception';
import Step from './Step';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Locale from '@locale/Locale';
import concretize from '../locale/locales/concretize';

export default class Halt extends Step {
    readonly exception: (evaluator: Evaluator) => Exception;

    constructor(
        exception: (evaluator: Evaluator) => Exception,
        node: Expression
    ) {
        super(node);

        this.exception = exception;
    }

    evaluate(evaluator: Evaluator): Value {
        return this.exception(evaluator);
    }

    getExplanations(locale: Locale) {
        return concretize(locale, locale.step.halt);
    }
}
