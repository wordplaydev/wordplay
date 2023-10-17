import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class UnparsableException extends ExceptionValue {
    readonly unparsable: Expression;

    constructor(evaluator: Evaluator, unparsable: Expression) {
        super(unparsable, evaluator);

        this.unparsable = unparsable;
    }

    getExceptionText(locales: Locales) {
        return locales.get(
            (l) => l.node.UnparsableExpression.exception.UnparsableException
        );
    }

    getExplanation(locales: Locales) {
        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            new NodeRef(
                this.unparsable,
                locales,
                this.getNodeContext(this.unparsable)
            )
        );
    }
}
