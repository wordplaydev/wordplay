import Exception from './Exception';
import type Evaluator from './Evaluator';
import Description from '../locale/Description';
import type Expression from '../nodes/Expression';

export default class InternalException extends Exception {
    readonly reason: string;
    constructor(expression: Expression, evaluator: Evaluator, reason: string) {
        super(expression, evaluator);
        this.reason = reason;
    }

    getDescription() {
        return Description.as(this.reason);
    }
}
