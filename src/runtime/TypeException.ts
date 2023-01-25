import type Type from '@nodes/Type';
import NodeLink from '@translation/NodeLink';
import type Translation from '@translation/Translation';
import ValueLink from '@translation/ValueLink';
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

    getDescription(translation: Translation) {
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
