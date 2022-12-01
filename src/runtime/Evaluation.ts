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
import type Program from "../nodes/Program";
import KeepStream from "./KeepStream";
import ValueException from "./ValueException";
import TypeException from "./TypeException";
import Structure from "./Structure";
import Primitive from "./Primitive";
import Measurement from "./Measurement";
import type Node from "../nodes/Node";
import Names from "../nodes/Names";
import type Expression from "../nodes/Expression";
import Finish from "./Finish";
import type UnaryOperation from "../nodes/UnaryOperation";
import type BinaryOperation from "../nodes/BinaryOperation";
import type Evaluate from "../nodes/Evaluate";
import type HOF from "../native/HOF";
import type Source from "../models/Source";
import type Convert from "../nodes/Convert";

export type EvaluatorNode = UnaryOperation | BinaryOperation | Evaluate | Convert | HOF | Source;
export type EvaluationNode = FunctionDefinition | StructureDefinition | ConversionDefinition | Source;

export default class Evaluation {

    /** The evaluator running the program. Some evaluations are created without running a program (e.g. stream structures). */
    readonly #evaluator: Evaluator;

    /** The node that caused this evaluation to start. */
    readonly #evaluatorNode: EvaluatorNode;

    /** The node that defined this program. */
    readonly #evaluationNode: Program | FunctionDefinition | StructureDefinition | ConversionDefinition | Source;

    /** A cache of the node's steps */
    readonly #steps: Step[];

    /** The evaluation in which this is being evaluated. */
    readonly #context: Evaluation | Value | undefined;

    /** A dictionary of values bound to names, preseving a mapping between names, language tags, and values */
    readonly _bindingsIndex: Map<string, Value> = new Map();
    readonly #bindings: Map<Names, Value> = new Map();

    /** This represents a stack of values returned by steps. */
    readonly #values: Value[] = [];

    /** A list of conversions in this context. */
    readonly #conversions: Conversion[] = [];

    /** The step to execute next */
    #step: number = 0;
    
    constructor(
        evaluator: Evaluator,
        evaluatorNode: EvaluatorNode,
        evaluationNode: EvaluationNode, 
        context?: Evaluation | Value, 
        bindings?: Map<Names, Value>) {

        this.#evaluator = evaluator;
        this.#evaluatorNode = evaluatorNode;
        this.#evaluationNode = evaluationNode;
        this.#context = context;

        // Ask the evaluator to compile (and optionally cache) steps for this definition.
        this.#steps = this.#evaluator.getSteps(evaluationNode);

        // Add any bindings given.
        if(bindings)
            for(const [ names, value ] of bindings)
                this.bind(names, value);

    }

    getCreator() { return this.#evaluatorNode; }
    getEvaluator() { return this.#evaluator; }
    getDefinition() { return this.#evaluationNode; }
    getContext() { return this.#context; }

    /** 
     * Given an Evaluator, evaluate the current step.
    * If it returns a value of any kind, return the value.
     * Otherwise just keep stepping.
     *  Undefined means that this will continue evaluating. A Value means it's done. 
     **/
    step(evaluator: Evaluator): Value | undefined {
    
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
    
        // If the last step didn't start a new evaluation and this one is over, just end it.
        if(evaluator.getCurrentEvaluation() === this && this.#step >= this.#steps.length)
            return this.popValue(undefined);

        // Otherwise, return nothing, since we're not done evaluating.

    }

    currentStep(): Step | undefined { return this.#steps[this.#step]; }
    priorStep() { return this.#step - 1 >= 0 ? this.#steps[this.#step - 1] : undefined; }
    nextStep() { return this.#step + 1 < this.#steps.length ? this.#steps[this.#step + 1] : undefined; }

    jump(distance: number) {
        this.#step += distance;
    }

    /** Tell the current evaluation to jump past the given expression */
    jumpPast(expression: Expression) {
        // Stop when we get to the Expression's Finish step
        while(this.#step < this.#steps.length && !(this.#steps[this.#step] instanceof Finish && this.#steps[this.#step].node === expression))
            this.#step++;
        // Step to just before the Finish, so the next step is the Finish.
        this.#step--;
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
    bind(names: Names, value: Value) {
        this.#bindings.set(names, value);
        for(const name of names.getNames())
            this._bindingsIndex.set(name, value);
    }

    /** Resolves the given name in this evaluation or its context. */
    resolve(name: string | Names): Value | undefined {
        if(name instanceof Names) {
            return this.#bindings.get(name) ?? this._bindingsIndex.get(name.getNames()[0]);
        }
        else {
            return  this._bindingsIndex.has(name) ? this._bindingsIndex.get(name) : 
                    this.#context === undefined ? undefined : 
                    this.#context.resolve(name, this.#evaluator);
        }
    }

    /** Remember the given conversion for later. */
    addConversion(conversion: Conversion) {
        this.#conversions.push(conversion);
    }

    /** Find a conversion that matches the given type */
    getConversion(input: Type, output: Type) {

        // Do any of the conversions in scope do the requested conversion?
        return this.#conversions.find(c => 
            c.definition.convertsTypeTo(input, output, this.#evaluator.getContext()));

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