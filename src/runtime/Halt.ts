import type Evaluator from '@runtime/Evaluator';
import type ExceptionValue from '@values/ExceptionValue';
import Step from './Step';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

export default class Halt extends Step {
    readonly exception: (evaluator: Evaluator) => ExceptionValue;

    constructor(
        exception: (evaluator: Evaluator) => ExceptionValue,
        node: Expression
    ) {
        super(node);

        this.exception = exception;
    }

    evaluate(evaluator: Evaluator): Value {
        return this.exception(evaluator);
    }

    getExplanations(locale: Locale) {
        return concretize(locale, locale.node.Program.halt);
    }
}
