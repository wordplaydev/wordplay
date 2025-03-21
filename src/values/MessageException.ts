import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Locales from '../locale/Locales';

export default class MessageException extends ExceptionValue {
    readonly message: string;
    constructor(creator: Expression, evaluator: Evaluator, message: string) {
        super(creator, evaluator);
        this.message = message;
    }

    getExceptionText() {
        return { description: this.message, explanation: this.message };
    }

    getExplanation(locales: Locales) {
        return locales.concretize(this.getExceptionText().explanation);
    }
}
