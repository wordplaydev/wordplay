import type ConversionDefinition from "../nodes/ConversionDefinition";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";
import Type from "../nodes/Type";
import type ConversionValue from "./ConversionValue";
import type Evaluator from "./Evaluator";
import Exception from "./Exception";
import type Step from "./Step";
import Stream from "./Stream";
import Value from "./Value";
import type Evaluable from "./Evaluable";
import type Program from "../nodes/Program";
import KeepStream from "./KeepStream";
import Context from "../nodes/Context";
import ValueException from "./ValueException";
import TypeException from "./TypeException";

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
        this.#steps = node.compile(this.#evaluator.getContext());

        // Set up the bindings
        this.#bindings = bindings === undefined ? new Map() : bindings;

    }

    getEvaluator() { return this.#evaluator; }
    getDefinition() { return this.#definition; }
    getContext() { return this.#context; }
    getNode() { return this.#node; }

    /** 
     * Given an Evaluator, evaluate the current step.
     * If it returns a value of any kind, return the value.
     * Otherwise just keep stepping.
     *  Undefined means that this will continue evaluating. A Value means it's done. 
     **/
    step(evaluator: Evaluator): Value | undefined {

        if(this.#steps === undefined) return;

        // If there are no more steps, return the value on the top of the stack.
        if(this.#step >= this.#steps.length) 
            return this.popValue(undefined);

        // Evaluate the next step.
        const result = this.#steps[this.#step].evaluate(evaluator);

        // If it's an exception, return it to the evaluator to halt the program.
        if(result instanceof Exception)
            return result;
        // If it's a stream, resolve it to its latest value, unless this will
        // be used in a Previous expression, in which case we leave it alone.
        else if(result instanceof Stream && !(this.nextStep() instanceof KeepStream)) {
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

    currentStep() { return this.#steps === undefined ? undefined : this.#steps[this.#step]; }

    nextStep() { return this.#steps && this.#step + 1 < this.#steps.length ? this.#steps[this.#step + 1] : undefined; }

    jump(distance: number) {
        this.#step += distance;
    }

    hasValue(): boolean { return this.#values.length > 0; }

    pushValue(value: Value): void { 
        this.#values.unshift(value); 
    }

    peekValue(): Value { 
        const value = this.#values[0];
        return value === undefined ? 
            new ValueException(this.#evaluator) : 
            value;
    }

    popValue(expected: Type | undefined): Value { 
        const value = this.#values.shift(); 
        if(value === undefined) return new ValueException(this.#evaluator);
        else if(expected !== undefined && value.getType().constructor !== expected.constructor) return new TypeException(this.#evaluator, expected, value);
        else return value;
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
        return this.#conversions.find(c => c.definition.output instanceof Type && c.definition.output.isCompatible(type, new Context(this.getEvaluator().getSource(), program)));

    }

    /** Finds the program that executed all of this in the evaluation context stack. */
    getProgram(): Program {
        return this.#evaluator.getProgram();
    }

    /** Allow the given aliases to be borrowed. */
    share() {

    }

}