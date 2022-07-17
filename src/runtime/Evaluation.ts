import type Node from "../nodes/Node";
import type Evaluator from "./Evaluator";
import Value from "./Value";

export interface Evaluable {
    /** Evaluates one step of the node in the context of the given Evaluator.
     *  Returns a Value when done evaluating or the next node to evaluate. */
    evaluate(evaluator: Evaluator): Value | Node | Evaluation;

}

export default class Evaluation {

    /** The node being evaluated. */
    readonly node: Evaluable;

    /** The evaluation in which this is being evaluated. */
    readonly context: Evaluation | undefined;
    
    /** The value that this computed, set after  */
    #value: Value | undefined = undefined;

    /** A dictionary of values bound to names */
    readonly bindings: Map<string, Value> = new Map();
    
    /** The number of times this has evaluated. Helps detect infinite loops and defecgts. */
    count = 0;

    constructor(context: Evaluation | undefined, node: Evaluable) {

        this.node = node;
        this.context = context;

    }

    /** Sets the value that was computed. */
    getValue() { return this.#value; }

    /** Given an Evaluator, evaluate this node, and return true if it's done. */
    evaluate(evaluator: Evaluator): Value | Evaluable {
        this.count++;
        const result = this.node.evaluate(evaluator);
        if(result instanceof Value)
            this.#value = result;
        return result;
    }

    /** Binds a value to a name in this evaluation. */
    bind(name: string, value: Value) {
        this.bindings.set(name, value);
    }

    /** Resolves the given name in this evaluation or its context. */
    resolve(name: string): Value | undefined {
        return this.bindings.has(name) ? this.bindings.get(name) : 
            this.context === undefined ? undefined : 
            this.context.resolve(name);
    }

    getCount() { return this.count; }

}