import Exception from './Exception';
import type Evaluator from './Evaluator';
import Description from '../locale/Description';

export default class InternalException extends Exception {
    readonly reason: string;
    constructor(evaluator: Evaluator, reason: string) {
        super(evaluator);
        this.reason = reason;
    }

    getDescription() {
        return Description.as(this.reason);
    }
}
