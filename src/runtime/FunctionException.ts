import type Evaluator from "./Evaluator";
import Exception from "./Exception";
import type Value from "./Value";

export default class FunctionException extends Exception {

    readonly subject: Value | undefined;
    readonly verb: string;

    constructor(evaluator: Evaluator, subject: Value | undefined, verb: string) {
        super(evaluator);

        this.subject = subject;
        this.verb = verb;

    }

    getExplanations() {
        return {
            "eng": `Couldn't find function named ${this.verb.toString()} on ${this.subject ===  undefined ? "this" : this.subject.toString()}.`
        }
    };

}