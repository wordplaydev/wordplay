import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import type Value from "./Value";

/** Represents one step a compiled program's execution. */
export default abstract class Step {

    /** The node to evaluate. */
    readonly node: Evaluable;

    constructor(node: Evaluable) {
        this.node = node;
    }

    abstract evaluate(evaluator: Evaluator): Value | undefined;

    toString() { return `${this.constructor.name} (${this.node.constructor.name})`; }

}