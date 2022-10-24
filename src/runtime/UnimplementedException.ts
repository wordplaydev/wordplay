import type Translations from "../nodes/Translations";
import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export default class UnimplementedException extends Exception {

    constructor(evaluator: Evaluator) {
        super(evaluator);
    }

    getExplanations(): Translations {
        return {
            eng: `${this.step?.node.toWordplay()} isn't implemented.`,
            "😀": `TODO: 🔨`
        }
    };

}