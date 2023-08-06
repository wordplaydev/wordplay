import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type Expression from '../nodes/Expression';
import Markup from '../nodes/Markup';
import type Locale from '../locale/Locale';

export default class InternalException extends ExceptionValue {
    readonly reason: string;
    constructor(expression: Expression, evaluator: Evaluator, reason: string) {
        super(expression, evaluator);
        this.reason = reason;
    }

    getExceptionText(locale: Locale) {
        return {
            description: 'internal exception',
            explanation: 'something very bad happened internally, sorry!',
        };
    }

    getExplanation() {
        return Markup.words(this.reason);
    }
}