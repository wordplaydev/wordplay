import type Type from "../nodes/Type";
import type Evaluation from "./Evaluation";
import type Evaluator from "./Evaluator";
import Exception from "./Exception";
import type Value from "./Value";

export default class TypeException extends Exception {

    readonly expected: Type;
    readonly received: Evaluation | Value | undefined;

    constructor(evaluator: Evaluator, expected: Type, received: Evaluation | Value | undefined) {
        super(evaluator);

        this.expected = expected;
        this.received = received;

    }

    getExplanations() {
        return {
            "eng": `${this.step?.node.toWordplay()} expected ${this.expected.toWordplay()}, received ${this.received}`
        }
    };

}