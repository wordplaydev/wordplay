import type Translations from "../nodes/Translations";
import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export enum StackSize { EMPTY, FULL }

export default class ContextException extends Exception {

    readonly reason: StackSize;

    constructor(evaluator: Evaluator, reason: StackSize) {
        super(evaluator);

        this.reason = reason;
    }

    getExplanations(): Translations {
        return this.reason === StackSize.EMPTY ?
            {
                eng: `Not executing any functions.`,
                "😀": `🫙`
            } :
            {
                eng: `Executed too many functions.`,
                "😀": `🫗`
            }
    };

}