import type BinaryOperation from '../nodes/BinaryOperation';
import type Convert from '../nodes/Convert';
import type Evaluate from '../nodes/Evaluate';
import type UnaryOperation from '../nodes/UnaryOperation';
import type Translation from '../translations/Translation';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Value from './Value';

export default class FunctionException extends Exception {
    readonly subject: Value | undefined;
    readonly node: Evaluate | BinaryOperation | UnaryOperation | Convert;
    readonly verb: string;

    constructor(
        evaluator: Evaluator,
        node: Evaluate | BinaryOperation | UnaryOperation | Convert,
        subject: Value | undefined,
        verb: string
    ) {
        super(evaluator);

        this.node = node;
        this.subject = subject;
        this.verb = verb;
    }

    getDescription(translation: Translation) {
        return translation.exceptions.function(this.node);
    }
}
