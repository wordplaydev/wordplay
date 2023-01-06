import Exception from './Exception';
import type Evaluator from './Evaluator';

export default class InternalException extends Exception {
    readonly reason: string;
    constructor(evaluator: Evaluator, reason: string) {
        super(evaluator);
        this.reason = reason;
    }

    getDescription() {
        return this.reason;
    }
}
