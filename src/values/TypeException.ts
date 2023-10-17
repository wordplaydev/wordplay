import type Type from '@nodes/Type';
import NodeRef from '@locale/NodeRef';
import ValueRef from '@locale/ValueRef';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Value from '@values/Value';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';
import type Locales from '../locale/Locales';

export default class TypeException extends ExceptionValue {
    readonly expected: Type;
    readonly received: Value;

    constructor(
        expression: Expression,
        evaluator: Evaluator,
        expected: Type,
        received: Value
    ) {
        super(expression, evaluator);

        this.expected = expected;
        this.received = received;
    }

    getExceptionText(locales: Locales) {
        return locales.get((l) => l.node.Is.exception.TypeException);
    }

    getExplanation(locales: Locales) {
        return concretize(
            locales,
            this.getExceptionText(locales).explanation,
            new NodeRef(
                this.expected,
                locales,
                this.getNodeContext(this.expected)
            ),
            new ValueRef(
                this.received,
                locales,
                this.getNodeContext(this.received.creator)
            )
        );
    }
}
