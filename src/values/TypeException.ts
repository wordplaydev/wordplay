import NodeRef from '@locale/NodeRef';
import type Type from '@nodes/Type';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Value from '@values/Value';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';

export default class TypeException extends ExceptionValue {
    readonly expected: Type;
    readonly received: Value;

    constructor(
        expression: Expression,
        evaluator: Evaluator,
        expected: Type,
        received: Value,
    ) {
        super(expression, evaluator);

        this.expected = expected;
        this.received = received;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Is.exception.TypeException);
    }

    getExplanation(locales: Locales) {
        return locales.concretize(
            this.getExceptionText(locales).explanation,
            new NodeRef(
                this.expected,
                locales,
                this.getNodeContext(this.expected),
            ),
            new NodeRef(
                this.received.getType(this.evaluator.getCurrentContext()),
                locales,
                this.getNodeContext(this.received.creator),
            ),
        );
    }
}
