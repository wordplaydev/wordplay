import type UnparsableExpression from '#nodes/UnparsableExpression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';

export default class UnparsableException extends ExceptionValue {
    readonly unparsable: UnparsableExpression;

    constructor(evaluator: Evaluator, unparsable: UnparsableExpression) {
        super(unparsable, evaluator);

        this.unparsable = unparsable;
    }

    getExceptionText(locales: Locales) {
        return locales.getTextStructure(
            (l) => l.node.UnparsableExpression.exception.UnparsableException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            (l) =>
                l.node.UnparsableExpression.exception.UnparsableException
                    .explanation,
            {},
        );
    }
}
