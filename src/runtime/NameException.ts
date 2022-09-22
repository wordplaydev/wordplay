import type Evaluator from "./Evaluator";
import Exception from "./Exception";

export default class UnparasableException extends Exception {

    readonly name: string;

    constructor(evaluator: Evaluator, name: string) {
        super(evaluator);

        this.name = name;

    }

    getExplanations() {
        return {
            "eng": `Couldn't find ${this.name}.`
        }
    };

}