import type ConversionDefinition from "../nodes/ConversionDefinition";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import type Conversion from "./Conversion";
import type Evaluator from "./Evaluator";
import Exception from "./Exception";
import type Step from "./Step";
import Stream from "./Stream";
import Value from "./Value";
import type Evaluable from "./Evaluable";
import type Program from "../nodes/Program";
import KeepStream from "./KeepStream";
import ValueException from "./ValueException";
import TypeException from "./TypeException";
import Structure from "./Structure";
import Primitive from "./Primitive";
import Measurement from "./Measurement";
import type Node from "../nodes/Node";

export default class Evaluation {

    /** The node that caused this evaluation to start. */
    readonly #creator: Node;

    /** The evaluator running the program */
    readonly #evaluator: Evaluator;

    /** The node that defined this program. */
    readonly #definition: Program | FunctionDefinition | StructureDefinition | ConversionDefinition;

    /** The node being evaluated. */
    readonly #node: Evaluable;

    /** A cache of the node's steps */
    readonly #steps: Step[];

    /** The evaluation in which this is being evaluated. */
    readonly #context: Evaluation | Value | undefined;

    /** A dictionary of values bound to names */
    readonly #bindings: Map<string, Value>;

    /** This represents a stack of values returned by steps. */
    readonly #values: Value[] = [];

    /** A list of conversions in this context. */
    readonly #conversions: Conversion[] = [];

    /** The step to execute next */
    #step: number = 0;
    
    constructor(
        evaluator: Evaluator,
        creator: Node,
        definition: Program | FunctionDefinition | StructureDefinition | ConversionDefinition, 
        node: Evaluable, 
        context?: Evaluation | Value, 
        bindings?: Map<string, Value>) {

        this.#creator = creator;
        this.#evaluator = evaluator;
        this.#definition = definition;
        this.#node = node;
        this.#context = context;

        // Cache the steps for the given node.
        this.#steps = node.compile(this.#evaluator.getContext());

        // Set up the bindings
        this.#bindings = bindings === undefined ? new Map() : bindings;

    }

    getCreator() { return this.#creator; }
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

    currentStep() { return this.#steps[this.#step]; }

    nextStep() { return this.#step + 1 < this.#steps.length ? this.#steps[this.#step + 1] : undefined; }

    jump(distance: number) {
        this.#step += distance;
    }

    hasValue(): boolean { return this.#values.length > 0; }

    getBindings() { return new Map(this.#bindings); }
    getValues() { return Array.from(this.#values); }
    binds(value: Value) { return Array.from(this.#bindings.values()).includes(value); }

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
        else if(expected !== undefined && value.getType(this.#evaluator.getContext()).constructor !== expected.constructor) return new TypeException(this.#evaluator, expected, value);
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
    addConversion(conversion: Conversion) {
        this.#conversions.push(conversion);
    }

    /** Find a conversion that matches the given type */
    getConversion(input: Type, output: Type) {

        const program = this.getProgram();
        if(program === undefined) return undefined;
        // Do any of the conversions in scope do the requested conversion?
        return this.#conversions.find(c => 
            c.definition.convertsTypeTo(input, output, this.getEvaluator().getContext()));

    }

    /** Finds the program that executed all of this in the evaluation context stack. */
    getProgram(): Program {
        return this.#evaluator.getProgram();
    }

    /** Finds the enclosuring structure closure, possibly this. */
    getThis(requestor: Node): Value | undefined {

        const context = this.#context;
        return context instanceof Structure ? context :
            context instanceof Measurement ? context.unitless(requestor) :
            context instanceof Primitive ? context :
            context instanceof Evaluation ? context.getThis(requestor) :
            undefined;

    }

    /** Allow the given aliases to be borrowed. */
    share() {

    }

}