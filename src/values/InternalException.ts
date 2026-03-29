import type Locales from '@locale/Locales';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Expression from '../nodes/Expression';

export default class InternalException extends ExceptionValue {
    readonly reason: string;
    constructor(expression: Expression, evaluator: Evaluator, reason: string) {
        super(expression, evaluator);
        this.reason = reason;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure((l) => l.node.Program.exception.InternalException);
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            this.getExceptionText(locales).explanation,
            this.reason,
        );
    }
}
