import type Evaluator from "./Evaluator";
import Exception from "./Exception";
import type Node from "../nodes/Node";
import type Translations from "../nodes/Translations";

export default class SemanticException extends Exception {

    readonly unparsable: Node;

    constructor(evaluator: Evaluator, unparsable: Node) {
        super(evaluator);

        this.unparsable = unparsable;

    }

    getExplanations(): Translations {
        return {
            eng: `${this.unparsable.toWordplay()} has a problem. Check for errors.`,
            "😀": "TODO: 🤷🏻‍♀️"
        }
    };

}