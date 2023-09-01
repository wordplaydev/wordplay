import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type Locale from '@locale/Locale';
import type Expression from '@nodes/Expression';
import concretize from '../locale/concretize';

export default class MessageException extends ExceptionValue {
    readonly message: string;
    constructor(creator: Expression, evaluator: Evaluator, message: string) {
        super(creator, evaluator);
        this.message = message;
    }

    getExceptionText() {
        return { description: this.message, explanation: this.message };
    }

    getExplanation(locale: Locale) {
        return concretize(locale, this.getExceptionText().explanation);
    }
}
