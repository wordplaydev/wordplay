import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class UnimplementedException extends ExceptionValue {
    readonly placeholder: Expression;
    constructor(evaluator: Evaluator, placeholder: Expression) {
        super(placeholder, evaluator);
        this.placeholder = placeholder;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.ExpressionPlaceholder.exception)
            .UnimplementedException;
    }

    getExplanation(locales: Locales) {
        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            new NodeRef(
                this.placeholder,
                locales,
                this.getNodeContext(this.placeholder)
            )
        );
    }
}
