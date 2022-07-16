import type Node from "../nodes/Node";
import type Evaluator from "./Evaluator";
import Value from "./Value";

export interface Evaluable {
    /** Evaluates one step of the node in the context of the given Evaluator.
     *  Returns a Value when done evaluating or the next node to evaluate. */
    evaluate(evaluator: Evaluator): Value | Node;

}

export default class Evaluation {

    /** The node being evaluated. */
    readonly node: Evaluable;
    
    /** The value that this computed, set after  */
    #value: Value | undefined = undefined;

    /** The number of times this has evaluated. Helps detect infinite loops and defecgts. */
    count = 0;

    constructor(node: Evaluable) {

        this.node = node;

    }

    /** Sets the value that was computed. */
    getValue() { return this.#value; }

    // Given an Evaluator, evaluate this node, and return true if it's done.
    evaluate(evaluator: Evaluator): Value | Evaluable {
        this.count++;
        const result = this.node.evaluate(evaluator);
        if(result instanceof Value)
            this.#value = result;
        return result;
    }

    getCount() { return this.count; }

}