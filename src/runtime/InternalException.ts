import Exception from './Exception';
import type Evaluator from './Evaluator';
import type Expression from '../nodes/Expression';
import Markup from '../nodes/Markup';

export default class InternalException extends Exception {
    readonly reason: string;
    constructor(expression: Expression, evaluator: Evaluator, reason: string) {
        super(expression, evaluator);
        this.reason = reason;
    }

    getDescription() {
        return Markup.words(this.reason);
    }
}
