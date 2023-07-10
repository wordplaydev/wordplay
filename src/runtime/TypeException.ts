import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import ValueLink from '@locale/ValueRef';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Value from './Value';
import concretize from '../locale/concretize';
import type Expression from '../nodes/Expression';

export default class TypeException extends Exception {
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

    getDescription(locale: Locale) {
        return concretize(
            locale,
            locale.node.Is.exception.TypeException,
            new NodeLink(
                this.expected,
                locale,
                this.getNodeContext(this.expected)
            ),
            new ValueLink(
                this.received,
                locale,
                this.getNodeContext(this.received.creator)
            )
        );
    }
}
