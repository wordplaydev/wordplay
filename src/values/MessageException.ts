import getConceptName from '@locale/getConceptName';
import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Locales from '@locale/Locales';

export default class MessageException extends ExceptionValue {
    readonly message: string;
    constructor(creator: Expression, evaluator: Evaluator, message: string) {
        super(creator, evaluator);
        this.message = message;
    }

    getExceptionText() {
        return { description: this.message, explanation: this.message };
    }

    /** The description is the raw message, which the explanation already shows;
     *  fall back to the generic concept name so headers don't duplicate the message. */
    getExceptionDescription(locales: Locales) {
        return locales.concretize((l) => getConceptName(l, 'exception'));
    }

    getExplanation(locales: Locales) {
        return locales.concretize(this.getExceptionText().explanation);
    }
}
