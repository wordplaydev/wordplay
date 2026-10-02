import type Locales from '#locale/Locales.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Expression from '#nodes/Expression.ts';

export default class InternalException extends ExceptionValue {
    readonly reason: string;
    constructor(expression: Expression, evaluator: Evaluator, reason: string) {
        super(expression, evaluator);
        this.reason = reason;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Program.exception.InternalException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) => l.node.Program.exception.InternalException.explanation,
            { reason: this.reason },
        );
    }
}
