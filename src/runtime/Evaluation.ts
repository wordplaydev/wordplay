import type ConversionDefinition from '@nodes/ConversionDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import type Conversion from './Conversion';
import type Evaluator from './Evaluator';
import Exception from './Exception';
import type Step from './Step';
import Stream from './Stream';
import Value from './Value';
import ValueException from './ValueException';
import TypeException from './TypeException';
import Structure from './Structure';
import Primitive from './Primitive';
import Measurement from './Measurement';
import type Node from '@nodes/Node';
import Names from '@nodes/Names';
import type Expression from '@nodes/Expression';
import Finish from './Finish';
import type UnaryOperation from '@nodes/UnaryOperation';
import type BinaryOperation from '@nodes/BinaryOperation';
import type Evaluate from '@nodes/Evaluate';
import type HOF from '../native/HOF';
import type Source from '@nodes/Source';
import type Convert from '@nodes/Convert';
import type Borrow from '@nodes/Borrow';
import Context from '@nodes/Context';
import StructureDefinitionValue from './StructureDefinitionValue';
import type { StepNumber } from './Evaluator';
import FunctionValue from './FunctionValue';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamDefinitionValue from './StreamDefinitionValue';
import type PropertyBind from '../nodes/PropertyBind';

export type EvaluatorNode =
    | UnaryOperation
    | BinaryOperation
    | Evaluate
    | PropertyBind
    | Convert
    | HOF
    | Borrow
    | Source;
export type EvaluationNode =
    | FunctionDefinition
    | StructureDefinition
    | StreamDefinition
    | ConversionDefinition
    | Source;

export default class Evaluation {
    /** The evaluator running the program. Some evaluations are created without running a program (e.g. stream structures). */
    readonly #evaluator: Evaluator;

    /** The source of the evaluation node. Undefined if native. */
    readonly #source: Source | undefined;

    /** The node that caused this evaluation to start. */
    readonly #evaluatorNode: EvaluatorNode;

    /** The context, for passing around to getType, etc. */
    readonly #context: Context;

    /** The global step count of this evaluation, from the evaluator. */
    readonly #stepNumber: StepNumber;

    /** The node that defined this expression being evaluated. */
    readonly #evaluationNode: EvaluationNode;

    /** A cache of the node's steps */
    readonly #steps: Step[];

    /** The evaluation in which this is being evaluated. */
    readonly #closure: Evaluation | Value | undefined;

    /** A dictionary of values bound to names, preseving a mapping between names, language tags, and values */
    readonly _bindingsIndex: Map<string, Value> = new Map();
    readonly #bindings: Map<Names, Value> = new Map();

    /** This represents a stack of values returned by steps. */
    readonly #values: Value[] = [];

    /** A list of conversions in this context. */
    readonly #conversions: Conversion[] = [];

    /** The step to execute next */
    #stepIndex: number = 0;

    constructor(
        evaluator: Evaluator,
        evaluatorNode: EvaluatorNode,
        evaluationNode: EvaluationNode,
        closure?: Evaluation | Value,
        bindings?: Map<Names, Value>
    ) {
        this.#evaluator = evaluator;
        this.#evaluatorNode = evaluatorNode;
        this.#evaluationNode = evaluationNode;
        this.#closure = closure;

        // Remember what step this was.
        this.#stepNumber = evaluator.getStepIndex();

        // Derive some state
        this.#source = evaluator.project.getSourceOf(evaluationNode);
        this.#context = new Context(
            evaluator.project,
            this.#source ?? evaluator.project.main
        );

        // Ask the evaluator to compile (and optionally cache) steps for this definition.
        this.#steps = this.#evaluator.getSteps(evaluationNode);

        // Add any bindings given.
        if (bindings)
            for (const [names, value] of bindings) this.bind(names, value);
    }

    getSource() {
        return this.#source;
    }
    getCreator() {
        return this.#evaluatorNode;
    }
    getCurrentNode() {
        return this.currentStep()?.node ?? this.getCreator();
    }
    getEvaluator(): Evaluator {
        return this.#evaluator;
    }
    getDefinition() {
        return this.#evaluationNode;
    }
    getClosure() {
        return this.#closure;
    }
    getContext() {
        return this.#context;
    }
    getStepNumber() {
        return this.#stepNumber;
    }
    /** Utility function for generating a missing value exception */
    getValueOrTypeException(
        expression: Expression,
        expected: Type,
        value: Value | Evaluation | undefined
    ) {
        return value === undefined || value instanceof Evaluation
            ? new ValueException(this.getEvaluator(), expression)
            : new TypeException(this.getEvaluator(), expected, value);
    }

    /**
     * Given an Evaluator, evaluate the current step.
     * If it returns a value of any kind, return the value.
     * Otherwise just keep stepping.
     *  Undefined means that this will continue evaluating. A Value means it's done.
     **/
    step(evaluator: Evaluator): Value | undefined {
        if (this.#stepIndex >= this.#steps.length) return this.end();

        // Evaluate the next step.
        const result = this.#steps[this.#stepIndex].evaluate(evaluator);

        // If it's an exception, return it to the evaluator to halt the program.
        if (result instanceof Exception) return result;
        // If it's a stream, resolve it to its latest value,
        // but remember where it came from so other expressions that need the stream
        // can get it back.
        else if (result instanceof Stream) {
            const value = result.latest();
            this.#values.unshift(value);
            evaluator.setStreamResolved(value, result);
        }
        // If it's a value, add it to the top of the stack.
        else if (result instanceof Value) {
            this.#values.unshift(result);
        }

        // Move to the next step.
        this.#stepIndex++;

        // If the last step didn't start a new evaluation and this one is over, just end it.
        if (
            evaluator.getCurrentEvaluation() === this &&
            this.#stepIndex >= this.#steps.length
        )
            return this.end();

        // Otherwise, return nothing, since we're not done evaluating.
    }

    end(): Value | undefined {
        // If this block is creating a structure, take the context and bindings we just created
        // and convert it into a structure.
        if (this.#evaluationNode instanceof StructureDefinition)
            return new Structure(this.#evaluatorNode, this);
        // Otherwise, return the value on the top of the stack.
        else return this.peekValue();
    }

    currentStep(): Step | undefined {
        return this.#steps[this.#stepIndex];
    }
    priorStep() {
        return this.#stepIndex - 1 >= 0
            ? this.#steps[this.#stepIndex - 1]
            : undefined;
    }
    nextStep() {
        return this.#stepIndex + 1 < this.#steps.length
            ? this.#steps[this.#stepIndex + 1]
            : undefined;
    }

    jump(distance: number) {
        this.#stepIndex += distance;
    }

    /** Tell the current evaluation to jump past the given expression */
    jumpPast(expression: Expression) {
        // Stop when we get to the Expression's Finish step
        while (
            this.#stepIndex < this.#steps.length &&
            !(
                this.#steps[this.#stepIndex] instanceof Finish &&
                this.#steps[this.#stepIndex].node === expression
            )
        )
            this.#stepIndex++;
        // Step to just before the Finish, so the next step is the Finish.
        this.#stepIndex--;
    }

    hasValue(): boolean {
        return this.#values.length > 0;
    }

    getBindings() {
        return new Map(this.#bindings);
    }

    getValues() {
        return Array.from(this.#values);
    }

    binds(value: Value) {
        return Array.from(this.#bindings.values()).includes(value);
    }

    pushValue(value: Value): void {
        this.#values.unshift(value);
    }

    peekValue(): Value | undefined {
        return this.#values[0];
    }

    popValue(requestor: Expression, expected: Type | undefined): Value {
        const value = this.#values.shift();
        if (value === undefined)
            return new ValueException(this.#evaluator, requestor);
        else if (
            expected !== undefined &&
            !expected.accepts(value.getType(this.#context), this.#context)
        )
            return new TypeException(this.#evaluator, expected, value);
        else return value;
    }

    /** Binds a value to a name in this evaluation. */
    bind(names: Names, value: Value) {
        this.#bindings.set(names, value);
        for (const name of names.getNames())
            this._bindingsIndex.set(name, value);
    }

    /** Resolves the given name in this evaluation or its context. */
    resolve(name: string | Names): Value | undefined {
        if (name instanceof Names) {
            return (
                this.#bindings.get(name) ??
                this._bindingsIndex.get(name.getNames()[0])
            );
        } else {
            return this._bindingsIndex.has(name)
                ? this._bindingsIndex.get(name)
                : this.#closure === undefined
                ? this.resolveDefault(name)
                : this.#closure.resolve(name, this.#evaluator);
        }
    }

    resolveDefault(name: string): Value | undefined {
        const def = this.#evaluator.project
            .getDefaultShares()
            .find((def) => def.hasName(name));

        // Any of the defaults match? Wrap them in values.
        if (def instanceof FunctionDefinition)
            return new FunctionValue(def, undefined);
        else if (def instanceof StructureDefinition)
            return new StructureDefinitionValue(
                this.#evaluator.project.main,
                def
            );
        else if (def instanceof StreamDefinition)
            return new StreamDefinitionValue(def);

        // Special case random as an implicit share.
        return undefined;
    }

    /** Remember the given conversion for later. */
    addConversion(conversion: Conversion) {
        this.#conversions.push(conversion);
    }

    /** Find a conversion that matches the given type */
    getConversion(input: Type, output: Type) {
        // Do any of the conversions in scope do the requested conversion?
        return this.#conversions.find((c) =>
            c.definition.convertsTypeTo(input, output, this.#context)
        );
    }

    /** Finds the enclosuring structure that "*" refers to. */
    getThis(requestor: Node): Value | undefined {
        const context = this.#closure;
        if (context instanceof Structure) return context;
        else if (context instanceof Measurement)
            return context.unitless(requestor);
        else if (context instanceof Primitive) return context;
        else if (context instanceof Evaluation)
            return context.getThis(requestor);
        else return undefined;
    }

    withValue(
        bind: PropertyBind,
        property: string,
        value: Value
    ): Evaluation | undefined {
        // Copy the current bindings.
        const newBindings: Map<Names, Value> = new Map(this.#bindings);

        // Find the corresponding name.
        const names = Array.from(newBindings.keys()).find((name) =>
            name.hasName(property)
        );

        // No corresponding name? Bail.
        if (names === undefined) return undefined;

        // Otherwise, set the bindings.
        newBindings.set(names, value);

        // Create the new evaluation.
        return new Evaluation(
            this.#evaluator,
            bind,
            this.#evaluationNode,
            this.#closure,
            newBindings
        );
    }
}
