import NodeRef from '@locale/NodeRef';
import type UnparsableExpression from '@nodes/UnparsableExpression';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Locales from '../locale/Locales';

export default class UnparsableException extends ExceptionValue {
    readonly unparsable: UnparsableExpression;

    constructor(evaluator: Evaluator, unparsable: UnparsableExpression) {
        super(unparsable, evaluator);

        this.unparsable = unparsable;
    }

    getExceptionText(locales: Locales) {
        return locales.get(
            (l) => l.node.UnparsableExpression.exception.UnparsableException,
        );
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            this.getExceptionText(locales).explanation,
            new NodeRef(
                this.unparsable,
                locales,
                this.getNodeContext(this.unparsable),
            ),
        );
    }
}
