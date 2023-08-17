import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import concretize from '../locale/concretize';
import type Type from '../nodes/Type';
import ValueRef from '../locale/ValueRef';
import type Value from '../values/Value';
import type Expression from '../nodes/Expression';

export default class ConversionException extends ExceptionValue {
    readonly from: Value;
    readonly to: Type;

    constructor(evaluator: Evaluator, node: Expression, from: Value, to: Type) {
        super(node, evaluator);

        this.from = from;
        this.to = to;
    }

    getExceptionText(locale: Locale) {
        return locale.node.Convert.exception.ConversionException;
    }

    getExplanation(locale: Locale) {
        return concretize(
            locale,
            this.getExceptionText(locale).explanation,
            // Wrap the node containing the name in a link
            new ValueRef(
                this.from,
                locale,
                this.evaluator.project.getNodeContext(this.creator)
            ),
            new NodeRef(
                this.to,
                locale,
                this.evaluator.project.getNodeContext(this.creator)
            )
        );
    }
}
