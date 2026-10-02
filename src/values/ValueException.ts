import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';

export default class ValueException extends ExceptionValue {
    readonly expression: Expression;
    constructor(evaluator: Evaluator, expression: Expression) {
        super(expression, evaluator);
        this.expression = expression;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.Program.exception.ValueException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(this.getExceptionText(locales).explanation);
    }
}
