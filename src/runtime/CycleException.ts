import type Borrow from "../nodes/Borrow";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export default class CycleException extends Exception {

    readonly borrow: Borrow;

    constructor(evaluator: Evaluator, borrow: Borrow) {
        super(evaluator);

        this.borrow = borrow;
    }

    getExplanations(): Translations {
        return {
            eng: `${this.borrow.toWordplay()} depends on itself.`,
            "😀": `${TRANSLATE} 🔨`
        }
    };

}