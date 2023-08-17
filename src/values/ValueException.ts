import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type Locale from '@locale/Locale';
import type Expression from '@nodes/Expression';
import concretize from '../locale/concretize';

export default class ValueException extends ExceptionValue {
    readonly expression: Expression;
    constructor(evaluator: Evaluator, expression: Expression) {
        super(expression, evaluator);
        this.expression = expression;
    }

    getExceptionText(locale: Locale) {
        return locale.node.Program.exception.ValueException;
    }

    getExplanation(locale: Locale) {
        return concretize(locale, this.getExceptionText(locale).explanation);
    }
}
