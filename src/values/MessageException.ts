import getConceptName from '#locale/getConceptName.ts';
import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';

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
