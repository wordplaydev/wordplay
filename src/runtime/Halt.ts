import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import type ExceptionValue from '@values/ExceptionValue';
import type Locales from '../locale/Locales';
import type Value from '../values/Value';
import Step from './Step';

export default class Halt extends Step {
    readonly exception: (evaluator: Evaluator) => ExceptionValue;

    constructor(
        exception: (evaluator: Evaluator) => ExceptionValue,
        node: Expression,
    ) {
        super(node);

        this.exception = exception;
    }

    evaluate(evaluator: Evaluator): Value {
        return this.exception(evaluator);
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Program.halt);
    }
}
