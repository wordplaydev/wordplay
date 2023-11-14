import type ConversionDefinition from '@nodes/ConversionDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import type ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import type Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import type Step from './Step';
import StreamValue from '../values/StreamValue';
import Value from '../values/Value';
import ValueException from '../values/ValueException';
import TypeException from '../values/TypeException';
import StructureValue from '../values/StructureValue';
import SimpleValue from '../values/SimpleValue';
import NumberValue from '@values/NumberValue';
import type Node from '@nodes/Node';
import Names from '@nodes/Names';
import type Expression from '@nodes/Expression';
import Finish from './Finish';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Evaluate from '@nodes/Evaluate';
import type Source from '@nodes/Source';
import type Convert from '@nodes/Convert';
import type Borrow from '@nodes/Borrow';
import StructureDefinitionValue from '../values/StructureDefinitionValue';
import type { StepNumber } from '@runtime/Evaluator';
import FunctionValue from '../values/FunctionValue';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamDefinitionValue from '../values/StreamDefinitionValue';
import type PropertyBind from '../nodes/PropertyBind';
import type Context from '../nodes/Context';
import StartFinish from './StartFinish';
import type TableLiteral from '../nodes/TableLiteral';
import type Insert from '../nodes/Insert';
import type Delete from '../nodes/Delete';
import type { Iteration } from '../basis/Iteration';
import Block, { BlockKind } from '@nodes/Block';
import BlankException from '@values/BlankException';
import NoneValue from '@values/NoneValue';

export type EvaluationNode =
    | UnaryEvaluate
    | BinaryEvaluate
    | Evaluate
    | PropertyBind
    | Convert
    | TableLiteral
    | Block
    | Insert
    | Delete
    | Iteration
    | Borrow
    | Source
    | StreamDefinition;

export type DefinitionNode =
    | FunctionDefinition
    | StructureDefinition
    | StreamDefinition
    | ConversionDefinition
    | Block
    | Source;

export default class Evaluation {
    /** The evaluator running the program. Some evaluations are created without running a program (e.g. stream structures). */
    readonly #evaluator: Evaluator;

    /** The source of the evaluation node. Undefined if basis. */
    readonly #source: Source | undefined;

    /** The node that caused this evaluation to start. */
    readonly #evaluation: EvaluationNode;

    /** The context, for passing around to getType, etc. */
    readonly #context: Context;

    /** The global step count of this evaluation, from the evaluator. */
    readonly #stepNumber: StepNumber;

    /** The node that defined this expression being evaluated. */
    readonly #definition: DefinitionNode;

    /** A cache of the node's steps */
    readonly #steps: Step[];

    /** The evaluation in which this is being evaluated. */
    readonly #closure: Evaluation | Value | undefined;

    /** A dictionary of values bound to names, preseving a mapping between names and values */
    readonly #bindings: Map<Names | string, Value>[] = [new Map()];

    /** This represents a stack of values returned by steps. */
    readonly #values: Value[] = [];

    /** A list of conversions in this context. */
    readonly #conversions: ConversionDefinitionValue[] = [];

    /** A sum of the sizes of all of the values bound */
    #size = 0;

    /** The step to execute next */
    #stepIndex = 0;

    constructor(
        evaluator: Evaluator,
        evaluation: EvaluationNode,
        definition: DefinitionNode,
        closure?: Evaluation | Value,
        bindings?: Map<Names | string, Value>
    ) {
        this.#evaluator = evaluator;
        this.#evaluation = evaluation;
        this.#definition = definition;
        this.#closure = closure;

        // Remember what step this was.
        this.#stepNumber = evaluator.getStepIndex();

        // Derive some state
        this.#source = evaluator.project.getSourceOf(definition);
        this.#context = evaluator.project.getContext(
            this.#source ?? evaluator.project.getMain()
        );

        // Ask the evaluator to compile (and optionally cache) steps for this definition.
        this.#steps = this.#evaluator.getSteps(definition);

        // Add any bindings given.
        if (bindings) {
            for (const [names, value] of bindings) this.bind(names, value);
        }
    }

    getSource() {
        return this.#source;
    }

    getCreator() {
        return this.#evaluation;
    }

    getCurrentNode() {
        return this.currentStep()?.node ?? this.getCreator();
    }

    getEvaluator(): Evaluator {
        return this.#evaluator;
    }

    getDefinition() {
        return this.#definition;
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
            : new TypeException(
                  expression,
                  this.getEvaluator(),
                  expected,
                  value
              );
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
        if (result instanceof ExceptionValue) return result;
        // If it's a stream, resolve it to its latest value,
        // but remember where it came from so other expressions that need the stream
        // can get it back.
        else if (result instanceof StreamValue) {
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
        if (this.#definition instanceof StructureDefinition)
            return new StructureValue(this.#evaluation, this);
        // Otherwise, return the value on the top of the stack.
        const value = this.peekValue();
        if (value) return value;
        // Special case block returns
        if (this.#definition instanceof Block) {
            if (this.#definition.kind === BlockKind.Root)
                return new BlankException(
                    this.#evaluator,
                    this.#evaluator.getMain().expression
                );
            else if (this.#definition.kind === BlockKind.Structure)
                return new NoneValue(this.#definition);
        }
        return new ValueException(this.#evaluator, this.#definition);
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
                this.#steps[this.#stepIndex].node === expression &&
                (this.#steps[this.#stepIndex] instanceof Finish ||
                    this.#steps[this.#stepIndex] instanceof StartFinish)
            )
        )
            this.#stepIndex++;
        // Step to just before the Finish, so the next step is the Finish.
        // We don't do this for StartFinish since it is the same step.
        if (this.#steps[this.#stepIndex] instanceof Finish) this.#stepIndex--;
    }

    hasValue(): boolean {
        return this.#values.length > 0;
    }

    getBindings() {
        return this.#bindings.map((b) => new Map(b));
    }

    getValues() {
        return Array.from(this.#values);
    }

    binds(value: Value) {
        return this.#bindings.some((bindings) =>
            Array.from(bindings.values()).includes(value)
        );
    }

    scope() {
        this.#bindings.unshift(new Map());
    }

    unscope() {
        this.#bindings.shift();
        if (this.#bindings.length === 0)
            console.error(
                'Error in evaluation, no bindings remaining in evaluation'
            );
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
            return new TypeException(
                requestor,
                this.#evaluator,
                expected,
                value
            );
        else return value;
    }

    /** Binds a value to a name in this evaluation. */
    bind(names: Names | string, value: Value) {
        const bindings = this.#bindings[0];

        this.#size += value.getSize();

        // Set the value by name or names.
        bindings.set(names, value);
        if (names instanceof Names)
            for (const name of names.getNames()) bindings.set(name, value);
    }

    /** A convience function for getting a value by name, but only if it is a certain type */
    get<Kind>(
        name: string | Names,
        type: new (...params: never[]) => Kind
    ): Kind | undefined {
        const value = this.resolve(name);
        return value instanceof type ? value : undefined;
    }

    /** Resolves the given name in this evaluation or its context. */
    resolve(name: string | Names): Value | undefined {
        // Search the stack of bindings for a matching name.
        for (const bindings of this.#bindings)
            if (bindings.has(name)) return bindings.get(name);

        // Didn't find one? Check the closure, or defaults if there's no closure.
        return typeof name === 'string'
            ? this.#closure === undefined
                ? this.resolveDefault(name)
                : this.#closure.resolve(name, this.#evaluator)
            : undefined;
    }

    resolveDefault(name: string): Value | undefined {
        const def = this.#evaluator.project.shares.all.find((def) =>
            def.hasName(name)
        );

        // Any of the defaults match? Wrap them in values.
        if (def instanceof FunctionDefinition)
            return new FunctionValue(def, undefined);
        else if (def instanceof StructureDefinition)
            return new StructureDefinitionValue(def);
        else if (def instanceof StreamDefinition)
            return new StreamDefinitionValue(def);

        // Special case random as an implicit share.
        return undefined;
    }

    /** Remember the given conversion for later. */
    addConversion(conversion: ConversionDefinitionValue) {
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
        if (context instanceof StructureValue) return context;
        else if (context instanceof NumberValue)
            return context.unitless(this.#definition);
        else if (context instanceof SimpleValue) return context;
        else if (context instanceof Evaluation)
            return context.getThis(requestor);
        else return undefined;
    }

    /** Given an input number in the evaluation's definition, get the corresponding input given to that input, if one was given. */
    getInput(index: number): Value | undefined {
        if (
            !(
                this.#definition instanceof FunctionDefinition ||
                this.#definition instanceof StructureDefinition
            )
        )
            return undefined;

        const names = this.#definition.inputs[index]?.names;
        return names ? this.resolve(names) : undefined;
    }

    withValue(
        creator: EvaluationNode,
        property: string,
        value: Value
    ): Evaluation | undefined {
        const bindings = this.#bindings[0];

        if (!bindings.has(property)) return undefined;

        const newEvaluation = new Evaluation(
            this.#evaluator,
            creator,
            this.#definition,
            this.#closure,
            this.#bindings[0]
        );

        // Find the corresponding name.
        const names = Array.from(newEvaluation.#bindings[0].keys()).find(
            (name) => name instanceof Names && name.hasName(property)
        );

        // Otherwise, set the bindings.
        newEvaluation.bind(names ?? property, value);

        // Create the new evaluation.
        return newEvaluation;
    }

    getSize() {
        // Get all the values from the bindings maps, flatten them into a list, and add up their sizes.
        return this.#size;
    }
}
