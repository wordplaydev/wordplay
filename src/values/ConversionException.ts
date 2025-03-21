import NodeRef from '@locale/NodeRef';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Locales from '../locale/Locales';
import ValueRef from '../locale/ValueRef';
import type Expression from '../nodes/Expression';
import type Type from '../nodes/Type';
import type Value from '../values/Value';

export default class ConversionException extends ExceptionValue {
    readonly from: Value;
    readonly to: Type;

    constructor(evaluator: Evaluator, node: Expression, from: Value, to: Type) {
        super(node, evaluator);

        this.from = from;
        this.to = to;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Convert.exception.ConversionException);
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            this.getExceptionText(locales).explanation,
            // Wrap the node containing the name in a link
            new ValueRef(
                this.from,
                locales,
                this.evaluator.project.getNodeContext(this.creator),
            ),
            new NodeRef(
                this.to,
                locales,
                this.evaluator.project.getNodeContext(this.creator),
            ),
        );
    }
}
