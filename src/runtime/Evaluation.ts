import type FunctionDefinition from "../nodes/FunctionDefinition";
import type Program from "../nodes/Program";
import type StructureDefinition from "../nodes/StructureDefinition";
import type Evaluable from "./Evaluable";
import type Evaluator from "./Evaluator";
import Exception, { ExceptionType } from "./Exception";
import type Step from "./Step";
import Value from "./Value";

export default class Evaluation {

    /** The node that defined this program. */
    readonly #definition: Program | FunctionDefinition | StructureDefinition;

    /** The node being evaluated. */
    readonly #node: Evaluable;

    /** A cache of the node's steps */
    readonly #steps: Step[];

    /** The evaluation in which this is being evaluated. */
    readonly #context: Evaluation | undefined;

    /** A dictionary of values bound to names */
    readonly #bindings: Map<string, Value>;

    /** This represents a stack of values returned by steps. */
    readonly #values: Value[] = [];

    /** The step to execute next */
    #step: number = 0;
    
    constructor(definition: Program | FunctionDefinition | StructureDefinition, node: Evaluable, context?: Evaluation, bindings?: Map<string, Value>) {

        this.#definition = definition;
        this.#node = node;
        this.#context = context;

        // Cache the steps for the given node.
        this.#steps = node.compile();

        // Set up the bindings
        this.#bindings = bindings === undefined ? new Map() : bindings;

    }

    getDefinition() { return this.#definition; }
    getNode() { return this.#node; }

    /** Given an Evaluator, evaluate this node, and return true if it's done. 
     *  Undefined means that this will continue evaluating. A Value means it's done. */
    step(evaluator: Evaluator): Value | undefined {

        // If there are no more steps, return the value on the top of the stack.
        if(this.#step >= this.#steps.length) 
            return this.popValue();

        // Evaluate the next step.
        const result = this.#steps[this.#step].evaluate(evaluator);

        // If it's an exception, return it to the evaluator to halt the program.
        if(result instanceof Exception)
            return result;
        // If it's a value, add it to the top of the stack.
        else if(result instanceof Value)
            this.#values.unshift(result);

        // Move to the next step.
        this.#step++;

    }

    jump(distance: number) {
        this.#step += distance;            
    }

    pushValue(value: Value): void { 
        this.#values.unshift(value); 
    }

    popValue(): Value { 
        const value = this.#values.shift(); 
        return value === undefined ? new Exception(ExceptionType.EXPECTED_VALUE) : value;
    }

    /** Binds a value to a name in this evaluation. */
    bind(name: string, value: Value) {
        this.#bindings.set(name, value);
    }

    /** Resolves the given name in this evaluation or its context. */
    resolve(name: string): Value | undefined {
        return this.#bindings.has(name) ? this.#bindings.get(name) : 
            this.#context === undefined ? undefined : 
            this.#context.resolve(name);
    }

}