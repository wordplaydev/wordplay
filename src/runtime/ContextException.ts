import type Translations from "../nodes/Translations";
import Exception from "./Exception";
import type Evaluator from "./Evaluator";

export enum StackSize { EMPTY, FULL }

export default class ContextException extends Exception {

    readonly reason: StackSize;

    constructor(reason: StackSize, evaluator: Evaluator) {
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