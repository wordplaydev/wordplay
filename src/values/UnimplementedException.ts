import type Locale from '@locale/Locale';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import concretize from '../locale/concretize';

export default class UnimplementedException extends ExceptionValue {
    readonly placeholder: Expression;
    constructor(evaluator: Evaluator, placeholder: Expression) {
        super(placeholder, evaluator);
        this.placeholder = placeholder;
    }

    getExceptionText(locale: Locale) {
        return locale.node.ExpressionPlaceholder.exception
            .UnimplementedException;
    }

    getExplanation(locale: Locale) {
        return concretize(
            locale,
            this.getExceptionText(locale).explanation,
            new NodeRef(
                this.placeholder,
                locale,
                this.getNodeContext(this.placeholder)
            )
        );
    }
}
