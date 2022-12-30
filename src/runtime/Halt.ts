import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type Evaluator from './Evaluator';
import type Exception from './Exception';
import Step from './Step';
import type Value from './Value';
import type Expression from '../nodes/Expression';

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

    getExplanations(): Translations {
        return {
            eng: `There was an exception, so the program had to stop.`,
            '😀': `${TRANSLATE} ✋🏻`,
        };
    }
}
