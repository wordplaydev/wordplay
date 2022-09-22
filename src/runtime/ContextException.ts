import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export enum StackSize { EMPTY, FULL }

export default class ContextException extends Exception {

    readonly reason: StackSize;

    constructor(evaluator: Evaluator, reason: StackSize) {
        super(evaluator);

        this.reason = reason;
    }

    getExplanations() {
        return {
            "eng": this.reason === StackSize.EMPTY ? `Not executing any functions.` : `Executed too many functions.`
        }
    };

}