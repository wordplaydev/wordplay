import type Evaluator from './Evaluator';
import type Exception from './Exception';
import Step from './Step';
import type Value from './Value';
import type Expression from '@nodes/Expression';
import type Translation from '@translation/Translation';

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

    getExplanations(translation: Translation) {
        return translation.step.halt;
    }
}
