import ExceptionValue from '@values/ExceptionValue';
import type Evaluator from '@runtime/Evaluator';
import type Expression from '@nodes/Expression';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class ValueException extends ExceptionValue {
    readonly expression: Expression;
    constructor(evaluator: Evaluator, expression: Expression) {
        super(expression, evaluator);
        this.expression = expression;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Program.exception.ValueException);
    }

    getExplanation(locales: Locales) {
        return concretize(locales, this.getExceptionText(locales).explanation);
    }
}
