import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Locale from '@locale/Locale';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import concretize from '../locale/concretize';

export default class UnparsableException extends Exception {
    readonly unparsable: Expression;

    constructor(evaluator: Evaluator, unparsable: Expression) {
        super(unparsable, evaluator);

        this.unparsable = unparsable;
    }

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.UnparsableExpression.exception.UnparsableException,
            new NodeRef(
                this.unparsable,
                locale,
                this.getNodeContext(this.unparsable)
            )
        );
    }
}
