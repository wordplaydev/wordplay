import type ConversionDefinition from "../nodes/ConversionDefinition";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";
import Type from "../nodes/Type";
import type ConversionValue from "./ConversionValue";
import type Evaluator from "./Evaluator";
import Exception, { ExceptionKind } from "./Exception";
import type Step from "./Step";
import Stream from "./Stream";
import Value from "./Value";
import type Evaluable from "./Evaluable";
import type Program from "../nodes/Program";

export default class Evaluation {

    /** The evaluator running the program */
    readonly #evaluator: Evaluator;

    /** The node that defined this program. */
    readonly #definition: Program | FunctionDefinition | StructureDefinition | ConversionDefinition;

    /** The node being evaluated. */
    readonly #node: Evaluable;

    /** A cache of the node's steps */
    readonly #steps?: Step[];

    /** The evaluation in which this is being evaluated. */
    readonly #context: Evaluation | Value | undefined;

    /** A dictionary of values bound to names */
    readonly #bindings: Map<string, Value>;

    /** This represents a stack of values returned by steps. */
    readonly #values: Value[] = [];

    /** A list of conversions in this context. */
    readonly #conversions: ConversionValue[] = [];

    /** The step to execute next */
    #step: number = 0;
    
    constructor(
        evaluator: Evaluator,
        definition: Program | FunctionDefinition | StructureDefinition | ConversionDefinition, 
        node: Evaluable, 
        context?: Evaluation | Value, 
        bindings?: Map<string, Value>) {

        this.#evaluator = evaluator;
        this.#definition = definition;
        this.#node = node;
        this.#context = context;

        // Cache the steps for the given node.
        this.#steps = node?.compile(this.#evaluator.getContext());

        // Set up the bindings
        this.#bindings = bindings === undefined ? new Map() : bindings;

    }

    getEvaluator() { return this.#evaluator; }
    getDefinition() { return this.#definition; }
    getContext() { return this.#context; }
    getNode() { return this.#node; }

    /** Given an Evaluator, evaluate this node, and return true if it's done. 
     *  Undefined means that this will continue evaluating. A Value means it's done. */
    step(evaluator: Evaluator): Value | undefined {

        if(this.#steps === undefined) return;

        // If there are no more steps, return the value on the top of the stack.
        if(this.#step >= this.#steps.length) 
            return this.popValue();

        // Evaluate the next step.
        const result = this.#steps[this.#step].evaluate(evaluator);

        // If it's an exception, return it to the evaluator to halt the program.
        if(result instanceof Exception)
            return result;
        // If it's a stream, resolve it to its latest value.
        else if(result instanceof Stream) {
            evaluator.rememberStreamAccess(result);
            this.#values.unshift(result.latest());
        }
        // If it's a value, add it to the top of the stack.
        else if(result instanceof Value) {
            this.#values.unshift(result);
        }

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
        return value === undefined ? new Exception(this.#definition, ExceptionKind.EXPECTED_VALUE) : value;
    }

    /** Binds a value to a name in this evaluation. */
    bind(name: string, value: Value) {
        this.#bindings.set(name, value);
    }

    /** Resolves the given name in this evaluation or its context. */
    resolve(name: string): Value | undefined {
        return this.#bindings.has(name) ? this.#bindings.get(name) : 
            this.#context === undefined ? undefined : 
            this.#context.resolve(name, this.#evaluator);
    }

    /** Remember the given conversion for later. */
    addConversion(conversion: ConversionValue) {
        this.#conversions.push(conversion);
    }

    /** Find a conversion that matches the given type */
    getConversion(type: Type) {

        const program = this.getProgram();
        if(program === undefined) return undefined;
        return this.#conversions.find(c => c.definition.output instanceof Type && c.definition.output.isCompatible({program: program }, type));

    }

    /** Finds the program that executed all of this in the evaluation context stack. */
    getProgram(): Program {
        return this.#evaluator.program;
    }

    /** Allow the given aliases to be borrowed. */
    share(name: string) {

    }

}