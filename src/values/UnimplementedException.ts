import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';

export default class UnimplementedException extends ExceptionValue {
    readonly placeholder: Expression;
    constructor(evaluator: Evaluator, placeholder: Expression) {
        super(placeholder, evaluator);
        this.placeholder = placeholder;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) =>
                l.node.ExpressionPlaceholder.exception.UnimplementedException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) =>
                l.node.ExpressionPlaceholder.exception.UnimplementedException
                    .explanation,
            {},
        );
    }
}
