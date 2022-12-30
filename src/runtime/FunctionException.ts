import type BinaryOperation from '../nodes/BinaryOperation';
import Convert from '../nodes/Convert';
import Evaluate from '../nodes/Evaluate';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type UnaryOperation from '../nodes/UnaryOperation';
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

    getExplanations(): Translations {
        return {
            eng: `Couldn't find ${
                this.node instanceof Evaluate
                    ? 'function'
                    : this.node instanceof Convert
                    ? 'conversion'
                    : 'operation'
            } ${this.verb.toString()} on ${
                this.subject === undefined ? 'this' : this.subject.toString()
            }.`,
            '😀': `${TRANSLATE} 🤷🏻‍♀️`,
        };
    }
}
