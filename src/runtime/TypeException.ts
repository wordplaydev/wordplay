import type Type from '../nodes/Type';
import type Translation from '../translations/Translation';
import type Evaluation from './Evaluation';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Value from './Value';

export default class TypeException extends Exception {
    readonly expected: Type;
    readonly received: Evaluation | Value | undefined;

    constructor(
        evaluator: Evaluator,
        expected: Type,
        received: Evaluation | Value | undefined
    ) {
        super(evaluator);

        this.expected = expected;
        this.received = received;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.type(this.expected);
    }
}
