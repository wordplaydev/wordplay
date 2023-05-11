import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import ValueLink from '@locale/ValueLink';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Value from './Value';

export default class TypeException extends Exception {
    readonly expected: Type;
    readonly received: Value;

    constructor(evaluator: Evaluator, expected: Type, received: Value) {
        super(evaluator);

        this.expected = expected;
        this.received = received;
    }

    getDescription(translation: Locale) {
        return translation.exceptions.type(
            new NodeLink(
                this.expected,
                translation,
                this.getNodeContext(this.expected)
            ),
            new ValueLink(
                this.received,
                translation,
                this.getNodeContext(this.received.creator)
            )
        );
    }
}
