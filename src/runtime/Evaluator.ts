import type Node from '@nodes/Node';
import type Reaction from '@nodes/Reaction';
import Evaluation, {
    type EvaluationNode,
    type EvaluatorNode,
} from './Evaluation';
import ReactionStream from './ReactionStream';
import type Stream from './Stream';
import Value from './Value';
import Exception from './Exception';
import ValueException from './ValueException';
import type Type from '@nodes/Type';
import Source from '@nodes/Source';
import type Names from '@nodes/Names';
import Expression from '@nodes/Expression';
import Project from '../models/Project';
import type Step from './Step';
import StructureDefinition from '@nodes/StructureDefinition';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Context from '@nodes/Context';

// Import this last, after everything else, to avoid cycles.
import { MAX_STREAM_LENGTH } from './Stream';
import Start from './Start';
import Finish from './Finish';
import EvaluationLimitException from './EvaluationLimitException';
import StepLimitException from './StepLimitException';
import TypeException from './TypeException';
import Random from '../input/Random';
import TemporalStream from './TemporalStream';
import StartFinish from './StartFinish';
import type { Native } from '../native/Native';

/** Anything that wants to listen to changes in the state of this evaluator */
export type EvaluationObserver = () => void;
export type StepNumber = number;
export type StreamChange = {
    changes: { stream: Stream; value: Value }[];
    stepIndex: number;
};
export type IndexedValue = { value: Value | undefined; stepNumber: StepNumber };
export const MAX_CALL_STACK_DEPTH = 256;
export const MAX_STEP_COUNT = 262144;

// Don't let source values take more than 256 MB of memory.
// One memory unit is probably an average of about 64 bytes, given how much
// provenance we store per value.
export const MAX_SOURCE_VALUE_SIZE = 1048576;

export enum Mode {
    Play,
    Step,
}

export default class Evaluator {
    /** The project that this is evaluating. */
    readonly project: Project;

    /** True if the evaluator reacts to stream inputs. */
    readonly reactive: boolean;

    /** This represents a stack of node evaluations. The first element of the stack is the currently evaluating node. */
    readonly evaluations: Evaluation[] = [];

    /** The last evaluation to be removed from the stack */
    #lastEvaluation: Evaluation | undefined;

    /** The callback to notify if the evaluation's value changes. */
    readonly observers: EvaluationObserver[] = [];

    /** False if start() has yet to be called, true otherwise. */
    #started: boolean = false;

    /** True if stop() was called */
    #stopped = false;

    /** The exception encountered */
    exception: Exception | undefined;

    /**
     * The global step counter, one for each step evaluated. Only ever goes up,
     * representing the farthest point in the future. */
    #stepCount: StepNumber = 0;

    /**
     * The global step index, indicating where in the history this evaluator is at.
     * If it is not in the past, it is equal to stepNumber. If it is less than
     * step number, it is in the past.
     * */
    #stepIndex: StepNumber = 0;

    /**
     * The total number of steps evaluated since the last reaction.
     */
    #totalStepCount: number = 0;

    /** True if the last step was triggered by a step to a particular node. */
    #steppedToNode: boolean = false;

    /** The streams changes that triggered this evaluation */
    reactions: StreamChange[] = [];

    /**
     * All of the native streams created while evaluating the program.
     * Each node gets a list of streams because multiple evaluations of the
     * node in a single evaluation generates a distinct stream for each evaluation.
     * They are uniquely identified by the index of their creation.
     * We keep an index of counts in order to do this mapping.
     * */
    nativeStreams: Map<EvaluatorNode, Stream[]> = new Map();
    nativeStreamEvaluationCount: Map<EvaluatorNode, number> = new Map();

    /** A derived cache of temporal streams, to avoid having to look them up. */
    nativeTemporalStreams: TemporalStream<any>[] = [];

    /** A mapping from Reaction nodes in the program to the streams they are listening to. */
    reactionStreams: Map<Reaction, Stream> = new Map();

    /** A set of possible execution modes, defaulting to play. */
    mode: Mode = Mode.Play;

    /** The value of each source, indexed by the step index at which it was created. */
    sourceValues: Map<Source, IndexedValue[]> = new Map();

    /** The total size of the source values, for managing memory */
    sourceValueSize: number = 0;

    /**
     * An execution history, mapping Expressions to the sequence of values they have produced.
     * Used for avoiding reevaluation, as well as the front end for debugging.
     */
    values: Map<Expression, IndexedValue[]> = new Map();

    /**
     * A cache of steps by node, to avoid recompilation.
     */
    steps: Map<EvaluationNode, Step[]> = new Map();

    /**
     * A global random stream for APIs to use.
     */
    random: Random;

    /**
     * The last time we received from requestAnimationFrame.
     */
    previousTime: DOMHighResTimeStamp | undefined = undefined;
    animating: boolean = false;

    /**
     * A list of temporal streams that have updated, for pooling them into a single reevaluation,
     * rather than evaluating each at once. Reset in Evaluator.tick(), filled by Stream.add() broadcasting
     * to this Evaluator.
     */
    temporalReactions: Stream[] = [];

    /** The animation multiplier to apply to all time-based streams. Can come from anywhere, but typically a user configuration.
     */
    timeMultiplier: number = 1;

    /**
     * Remember streams that were converted to values so we can convert them back to streams
     * when needed in stream operations.
     */
    readonly streamsResolved: Map<Value, Stream> = new Map();

    /** Remember streams accessed during reactions conditions so we can decide whether to reevaluate */
    readonly reactionDependencies: {
        reaction: Reaction;
        streams: Set<Stream>;
    }[] = [];

    /**
     * Create a new evalutor, given some project.
     * @param project The project to evaluate.
     * @param prior Inherits the settings and streams of the given Evaluator, if provided.
     * @param reactive Reacts to stream input if true. False is useful for just getting a program's initial value without starting streams.
     * */
    constructor(
        project: Project,
        prior: Evaluator | undefined = undefined,
        reactive: boolean = true
    ) {
        this.project = project;

        this.reactive = reactive;

        // Create a global random number stream for APIs to use.
        this.random = new Random(this, undefined, undefined, undefined);

        // Set up start state.
        this.resetAll();

        // Mirror the given prior, if there is one.
        if (prior) this.mirror(prior);
    }

    /**
     * Evaluates the given program and returns its value.
     * This is primarily used for testing.
     */
    static evaluateCode(
        native: Native,
        main: string,
        supplements?: string[]
    ): Value | undefined {
        const source = new Source('test', main);
        const project = new Project(
            null,
            'test',
            source,
            (supplements ?? []).map(
                (code, index) => new Source(`sup${index + 1}`, code)
            ),
            native
        );
        return new Evaluator(project).getInitialValue();
    }

    /** Mirror the given evaluator's stream history and state, but with the new source. */
    mirror(evaluator: Evaluator) {
        const isPlaying = evaluator.getMode() === Mode.Play;
        if (isPlaying) {
            // Set the evaluator's playing state to the current playing state.
            this.setMode(Mode.Play);
        } else {
            // Play to the same place the old project's evaluator was at.
            this.start();
            this.setMode(Mode.Step);
        }
    }

    // GETTERS

    getMain(): Source {
        return this.project.main;
    }
    getMode(): Mode {
        return this.mode;
    }
    getNative(): Native {
        return this.project.native;
    }
    getCurrentStep() {
        return this.evaluations[0]?.currentStep();
    }
    getNextStep() {
        return this.evaluations[0]?.nextStep();
    }
    getCurrentEvaluation() {
        return this.evaluations.length === 0 ? undefined : this.evaluations[0];
    }
    getLastEvaluation() {
        return this.#lastEvaluation;
    }
    getCurrentContext() {
        return (
            this.getCurrentEvaluation()?.getContext() ??
            new Context(this.project, this.project.main)
        );
    }
    /** Get whatever the latest result was of evaluating the program and its streams. */
    getLatestSourceValue(source: Source): Value | undefined {
        return this.getSourceValueBefore(source, this.getStepIndex());
    }

    getSourceValueBefore(source: Source, stepIndex: number) {
        const indexedValues = this.sourceValues.get(source);
        if (indexedValues === undefined) return undefined;
        for (let index = indexedValues.length - 1; index >= 0; index--) {
            const val = indexedValues[index];
            if (val.stepNumber <= stepIndex) return val.value;
        }
        return undefined;
    }

    getStepCount() {
        return this.#stepCount;
    }
    getStepIndex() {
        return this.#stepIndex;
    }
    getEarliestStepIndexAvailable() {
        return this.reactions[0]?.stepIndex ?? 0;
    }
    getSteps(evaluation: EvaluationNode): Step[] {
        // No expression? No steps.
        let steps = this.steps.get(evaluation);
        if (steps === undefined) {
            // Get the expression of the given node and compile it.
            const expression = evaluation.expression;
            if (expression === undefined) steps = [];
            else {
                const context =
                    this.project.getNodeContext(expression) ??
                    new Context(this.project, this.project.main);
                steps = expression.compile(context);
            }
            this.steps.set(evaluation, steps);
        }
        return steps;
    }

    /**
     * Gets the node corresponding to the current step within this project.
     * If the current step isn't in this project, chooses the nearest node
     * in this project that started an evaluation.
     */
    getStepNode() {
        // Iterate through the current evaluations until we find one in this project.
        let step = undefined;
        for (const evaluation of this.evaluations) {
            const currentStep = evaluation.currentStep();
            if (currentStep && this.project.contains(currentStep.node)) {
                step = currentStep;
                break;
            }
        }

        if (step === undefined) return;

        return step instanceof Start
            ? step.node.getStart()
            : step instanceof Finish
            ? step.node.getFinish()
            : step.node.getStart();
    }

    getLatestExpressionValueInEvaluation(expression: Expression) {
        const root = this.project
            .getRoot(expression)
            ?.getEvaluationRoot(expression);
        const eva = root ? this.getEvaluationOf(root) : undefined;
        return eva
            ? this.getLatestExpressionValue(
                  expression,
                  this.getStepIndex(),
                  eva.getStepNumber()
              )
            : undefined;
    }

    getExpressionValueAtIndex(
        expression: Expression,
        index: number
    ): Value | undefined {
        return this.values.get(expression)?.find((v) => v.stepNumber === index)
            ?.value;
    }

    getLatestExpressionValue(
        expression: Expression,
        beforeStepNumber?: number,
        afterStepNumber?: number
    ): Value | undefined {
        const values = this.values.get(expression);
        // No values? Return nothing.
        if (values === undefined || values.length === 0) return undefined;
        // No step number? Return the latest.
        if (beforeStepNumber === undefined)
            return values[values.length - 1].value;
        // Was a step index given that the value should be computed after? Find the first value with a step index after.
        for (let index = values.length - 1; index >= 0; index--) {
            const step = values[index].stepNumber;
            if (
                step < beforeStepNumber &&
                (afterStepNumber === undefined || step > afterStepNumber)
            )
                return values[index].value;
        }
        return undefined;
    }

    /** Finds the evaluation on the stack evaluating the given expression, if there is one. */
    getEvaluationOf(expression: Expression) {
        return this.evaluations.find((e) => e.getDefinition() === expression);
    }

    // PREDICATES

    isStarted(): boolean {
        return this.#started;
    }

    isPlaying(): boolean {
        return this.mode === Mode.Play;
    }

    isStepping(): boolean {
        return this.mode === Mode.Step;
    }

    isDone() {
        return this.evaluations.length === 0;
    }

    getThis(requestor: Node): Value | undefined {
        return this.getCurrentEvaluation()?.getThis(requestor);
    }

    steppedToNode(): boolean {
        return this.#steppedToNode;
    }

    isInPast(): boolean {
        return this.#stepIndex < this.#stepCount;
    }

    isAtBeginning(): boolean {
        return this.#stepIndex === 0;
    }

    /** True if any of the evaluations on the stack are evaluating the given source. Used for detecting cycles. */
    isEvaluatingSource(source: Source) {
        return this.evaluations.some((e) => e.getSource() === source);
    }

    /** True if the given evaluation node is on the stack */
    isEvaluating(expression: Expression) {
        return this.getEvaluationOf(expression) !== undefined;
    }

    /** Given a node, returns true if the node participates in a step in this program. */
    nodeIsStep(node: Node): boolean {
        // Find evaluable nodes and see if their steps
        // so we can analyze them for various purposes.
        for (const source of this.project.getSources()) {
            for (const evaluation of source.nodes()) {
                if (
                    evaluation instanceof FunctionDefinition ||
                    evaluation instanceof StructureDefinition ||
                    evaluation instanceof ConversionDefinition ||
                    evaluation instanceof Source
                ) {
                    const steps = this.getSteps(evaluation);
                    const step = steps.find((step) => step.node === node);
                    if (step !== undefined) return true;
                }
            }
        }
        return false;
    }

    // CONTROLS

    setMode(mode: Mode) {
        this.mode = mode;
        this.broadcast();
    }

    /** Reset everything necessary for a new evaluation. */
    resetForEvaluation(keepConstants: boolean, broadcast: boolean = true) {
        // Reset the non-constant expression values.
        if (keepConstants) {
            for (const [expression] of this.values)
                if (!this.project.isConstant(expression))
                    this.values.delete(expression);
        } else this.values.clear();

        // Reset the evluation stack.
        this.evaluations.length = 0;
        this.#lastEvaluation = undefined;

        // Didn't recently step to node.
        this.#steppedToNode = false;

        // Reset the streams resolved to avoid memory leaks.
        this.streamsResolved.clear();

        // Reset the stream evaluation count
        this.nativeStreamEvaluationCount.clear();

        // Notify listeners.
        if (broadcast) this.broadcast();
    }

    /** Reset all of the state, preparing for evaluation from the start of time. */
    resetAll() {
        // Mark as not started.
        this.#started = false;

        // Reset per-evaluation state.
        this.resetForEvaluation(false);

        // Reset the latest source values. (We keep them around for display after each reaction).
        this.sourceValues = new Map();
        this.sourceValueSize = 0;

        // Clear the stream mapping
        this.nativeStreams = new Map();

        this.broadcast();
    }

    getInitialValue() {
        this.setMode(Mode.Play);
        this.start();
        this.pause();
        return this.getLatestSourceValue(this.project.main);
    }

    /** Evaluate until we're done */
    start(changedStreams?: Stream[]): void {
        // Reset all state.
        this.resetForEvaluation(true);

        // Mark as started.
        this.#started = true;

        // Reset the recent step count to zero.
        this.#totalStepCount = 0;

        // If we're in the present, remember the stream change. (If we're in the past, we use the history.)
        if (!this.isInPast()) {
            this.reactions.push({
                changes: (changedStreams ?? []).map((stream) => {
                    return { stream, value: stream.latest() };
                }),
                stepIndex: this.getStepCount(),
            });
            // Keep trimmed to a reasonable size to prevent memory leaks and remember the earliest step available.
            if (this.reactions.length > MAX_STREAM_LENGTH) {
                const oldest = Math.max(
                    0,
                    this.reactions.length - MAX_STREAM_LENGTH
                );
                this.reactions = this.reactions.slice(
                    oldest,
                    oldest + MAX_STREAM_LENGTH
                );
            }
        }

        // Find all unused supplements and start evaluating them now, so they evaluate after main.
        for (const unused of this.project.getUnusedSupplements())
            this.evaluations.push(new Evaluation(this, unused, unused));

        // Push the main source file onto the evaluation stack.
        this.evaluations.push(
            new Evaluation(this, this.getMain(), this.getMain())
        );

        // Tell listeners that we started.
        this.broadcast();

        // If in play mode, we finish (and notify listeners again).
        if (this.isPlaying()) this.finish();
    }

    play() {
        this.setMode(Mode.Play);
        this.finish();
    }

    pause() {
        this.setMode(Mode.Step);
        this.broadcast();
    }

    /** Stop execution, eliminate observers, and stop all streams. */
    stop() {
        this.#stopped = true;
        this.observers.length = 0;
        this.stopStreams();
    }

    stopStreams() {
        // Stop all native streams.
        for (const streams of this.nativeStreams.values()) {
            for (const stream of streams) stream.stop();
        }
    }

    /**
     * Evaluates until reaching a step on the specified node.
     * Evaluates to the end if there is no such step.
     */
    stepToNode(node: Node) {
        while (this.isInPast() && !this.isDone()) {
            this.step();
            const step = this.getCurrentStep();
            if (
                step &&
                step.node === node &&
                (step instanceof StartFinish || step instanceof Finish)
            ) {
                this.stepWithinProgram();
                break;
            }
        }
        this.#steppedToNode = true;

        // Notify listeners that we tried to step to the node.
        this.broadcast();
    }

    /**
     * Step backwards to the end of the most recent evaluation of the given node
     **/
    stepBackToNode(node: Node) {
        // Keep searching backwards for a more recent value.
        while (this.getStepIndex() !== this.getEarliestStepIndexAvailable()) {
            // See if there's a value we have cached, and if so, just step just past it's index to make it visible.
            if (node instanceof Expression && this.values.has(node)) {
                const values = this.values.get(node);
                if (values) {
                    // Find values computed one step before the current.
                    const previousStepIndex = values
                        .filter((val) => val.stepNumber < this.#stepIndex - 1)
                        .at(-1)?.stepNumber;
                    if (previousStepIndex !== undefined) {
                        // Step the value step, then one step past it.
                        this.stepTo(previousStepIndex);
                        this.stepWithinProgram();
                        this.broadcast();
                        return;
                    }
                }
            }

            // If we didn't find one, step to the end of the previous input and check again.
            this.stepBackToInput();
            this.stepBack(-1, false);
        }

        this.broadcast();
    }

    /** Keep evaluating steps in this project until out of the current evaluation. */
    stepOut(): void {
        const currentEvaluation = this.evaluations[0];
        if (currentEvaluation === undefined) return;
        while (
            this.evaluations.length > 0 &&
            currentEvaluation === this.evaluations[0]
        )
            this.stepWithinProgram();
    }

    finish(): void {
        // Run all of the steps until we get a value or we're stopped.
        while (!this.#stopped && !this.isDone()) this.step();

        // Notify listeners that we finished evaluating.
        this.broadcast();
    }

    end(exception?: Exception) {
        // If there's an exception, end all sources with the exception.
        while (this.evaluations.length > 0) this.endEvaluation(exception);

        // If we're in the past and there's another stream change at this step index, start again.
        if (this.isInPast()) {
            let next;
            for (const change of this.reactions) {
                if (change.stepIndex >= this.getStepIndex()) {
                    next = change;
                    break;
                }
            }
            if (next) this.start(next.changes.map((change) => change.stream));
        } else if (exception) {
            this.exception = exception;
            this.stopStreams();
        }

        // Notify observers.
        this.broadcast();
    }

    /**
     * Advance one step in execution.
     * Return any exceptions or the final value when there's nothing left to execute.
     * Otherwise, return undefined, as a signal that we're still stepping.
     **/
    step(): void {
        // Get the evaluation to step.
        const evaluation = this.getCurrentEvaluation();

        // If there's no node evaluating, do nothing.
        if (evaluation === undefined) return;

        // Reset step to node.
        this.#steppedToNode = false;

        // Get the value of the next step of the current evaluation.
        const value =
            // If it seems like we're stuck in an infinite (recursive) loop, halt.
            this.evaluations.length > MAX_CALL_STACK_DEPTH
                ? new EvaluationLimitException(
                      this,
                      this.project.main.expression,
                      this.evaluations.map((e) => e.getDefinition())
                  )
                : // If it seems like we're evaluating something very time consuming, halt.
                this.#totalStepCount > MAX_STEP_COUNT
                ? new StepLimitException(this, this.project.main.expression)
                : // Otherwise, step the current evaluation and get it's value
                  evaluation.step(this);

        // If it's an exception, halt execution by returning the exception value.
        if (value instanceof Exception) this.end(value);
        // If it's another kind of value, pop the evaluation off the stack and add the value to the
        // value stack of the new top of the stack.
        else if (value instanceof Value) {
            // End the Evaluation
            this.endEvaluation(value);
            // If there's another Evaluation on the stack, pass the value to it by pushing it onto it's stack.
            if (this.evaluations.length > 0) {
                this.evaluations[0].pushValue(value);
                // Remember the value that was evaluated.
                this.saveExpressionValue(evaluation.getCreator(), value);
            }
            // Otherwise, save the value and clean up this final evaluation; nothing left to do!
            else this.end();
        }
        // If there was no value, that just means it's not done yet.

        // Finally, manage the step counter. Always increment the step index, and if we're in the present,
        // then also increment the step count.
        this.#stepIndex++;

        if (!this.isInPast()) {
            this.#totalStepCount++;
            this.#stepCount = this.#stepIndex;
        }
    }

    /** Keep evaluating steps in this project, skipping over nodes in other programs. */
    stepWithinProgram() {
        let nextStepNode = undefined;
        do {
            // Step ahead
            this.step();
            // Get the current step node
            nextStepNode = this.getCurrentStep()?.node;
        } while (
            nextStepNode !== undefined &&
            !this.project.contains(nextStepNode)
        );

        // Notify listeners that we finished stepping to the next within program node.
        this.broadcast();

        return true;
    }

    /**
     * Step backwards. This involves moving the stepIndex back, then reevaluating the project --
     * from the beginning -- until reaching the stepIndex. This relies on memoization of non-deterministic inputs.
     */
    stepBack(offset: number = -1, broadcast: boolean = true) {
        if (this.isPlaying()) this.pause();

        // Compute our our target step
        const destinationStep = Math.max(
            this.#stepIndex + offset,
            this.getEarliestStepIndexAvailable()
        );

        // Find the latest reaction prior to the desired step.
        const change = this.getReactionPriorTo(destinationStep);

        // Step to the change's step index.
        this.#stepIndex = change ? change.stepIndex : 0;

        // Reset the project to the beginning of time (but preserve stream history, since that's stored in project).
        this.resetForEvaluation(true, broadcast);

        // Start the evaluation fresh.
        this.start();

        // Step until reaching the target step index.
        while (this.#stepIndex < destinationStep) {
            // If done, then something's broken, since it should always be possible to ... GET BACK TO THE FUTURE (lol)
            if (this.isDone())
                throw Error(
                    `Couldn't get back to the future; step ${destinationStep}/${
                        this.#stepCount
                    } unreachable. Fatal defect in Evaluator.`
                );

            this.step();
        }

        // Notify listeners that we made it.
        if (broadcast) this.broadcast();

        return true;
    }

    /** Step back until reaching a step in the project. */
    stepBackWithinProgram() {
        let nextStepNode = undefined;
        do {
            // Step back
            this.stepBack();
            // Get the current step node
            nextStepNode = this.getCurrentStep()?.node;
        } while (
            nextStepNode !== undefined &&
            !this.project.contains(nextStepNode)
        );

        // Notify listeners that we finished stepping to the next within program node.
        this.broadcast();

        return true;
    }

    stepToInput() {
        // Find the input after the current index.
        const change = this.reactions.find(
            (change) => change.stepIndex > this.getStepIndex()
        );

        // If there's no change after the current step, step to the end.
        if (change === undefined) {
            this.stepToEnd();
            return true;
        }

        // Run all of the steps until we get a value or we're stopped.
        while (!this.isDone() && this.getStepIndex() < change.stepIndex)
            this.step();

        // Notify listeners that we reached the step.
        this.broadcast();

        return true;
    }

    stepBackToInput() {
        // Find the changed stream just before the current step index and step back to it.
        let latestChange;
        for (const change of this.reactions) {
            if (change.stepIndex >= this.getStepIndex()) break;
            else latestChange = change;
        }
        // If we found a change, step back to it.
        if (latestChange) {
            this.stepTo(latestChange.stepIndex);
            this.broadcast();
            return true;
        }
        // Otherwise, step to beginning.
        else {
            this.stepTo(0);
        }
    }

    stepTo(stepIndex: StepNumber) {
        if (this.isPlaying()) this.pause();
        this.stepBack(stepIndex - this.getStepIndex());
    }

    stepToEnd() {
        this.stepTo(this.#stepCount);
    }

    // OBSERVERS

    observe(observer: EvaluationObserver) {
        this.observers.push(observer);
    }

    ignore(observer: EvaluationObserver) {
        const index = this.observers.indexOf(observer);
        if (index >= 0) this.observers.splice(index, 1);
    }

    broadcast() {
        this.observers.forEach((observer) => observer());
    }

    // STREAM AND REACTION MANAGMEENT

    getReactionPriorTo(stepIndex: StepNumber): StreamChange | undefined {
        for (let index = this.reactions.length - 1; index >= 0; index--) {
            const change = this.reactions[index];
            if (change.stepIndex <= stepIndex) return change;
        }
        return this.reactions[0];
    }

    isInitialEvaluation() {
        return this.reactions.length === 1;
    }

    didStreamCauseReaction(stream: Stream) {
        // Find the latest stream change after the current step index,
        // and return the stream that triggered evaluation, if any.
        let latest;
        for (const change of this.reactions) {
            latest = change;
            // Stop once we've passed the current time.
            if (change.stepIndex > this.getStepIndex()) break;
        }

        // True if the latest stream change is the given stream.
        return (
            latest !== undefined &&
            latest.changes.some((change) => change.stream === stream)
        );
    }

    /**
     * True if the given node has a stream yet. Time-dependent, so it returns false
     * even if there is a stream, but the stream's first value was after the curren time.
     * */
    hasReactionStream(reaction: Reaction) {
        const stream = this.reactionStreams.get(reaction);
        return stream && stream.getFirstStepIndex() < this.getStepIndex();
    }

    getReactionStreamLatest(reaction: Reaction): Value | undefined {
        return this.reactionStreams.get(reaction)?.latest();
    }

    addToReactionStream(reaction: Reaction, value: Value) {
        // If in the past, do nothing, since we're just reusing historical values.
        // Otherwise, add the value or create the stream if it doesn't yet exist.
        if (!this.isInPast()) {
            const stream = this.reactionStreams.get(reaction);
            if (stream) stream.add(value);
            else {
                const newStream = new ReactionStream(this, reaction, value);
                this.reactionStreams.set(reaction, newStream);
            }
        }
    }

    getStreamResolved(value: Value): Stream | undefined {
        const stream = this.streamsResolved.get(value);

        // If we're tracking a reaction's dependencies, remember this was obtained.
        if (stream && this.reactionDependencies.length > 0)
            this.reactionDependencies[0].streams.add(stream);

        return stream;
    }

    setStreamResolved(value: Value, stream: Stream) {
        this.streamsResolved.set(value, stream);

        // If we're tracking a reaction's dependencies, remember this was converted into a value.
        if (this.reactionDependencies.length > 0)
            this.reactionDependencies[0].streams.add(stream);
    }

    getNativeStreamsOfType<Kind extends Stream>(
        type: new (...params: any[]) => Kind
    ) {
        // Make a big list of all the streams and filter by the ones of the given type.
        return Array.from(this.nativeStreams.values())
            .reduce((streams, list) => streams.concat(list), [])
            .filter((stream): stream is Kind => stream instanceof type);
    }

    /** Called by stream definitions to identify previously created streams to which an evaluation should correspond. */
    incrementNativeStreamEvaluationCount(evaluate: EvaluatorNode) {
        // Set or increment the evaluation count.
        const count = this.nativeStreamEvaluationCount.get(evaluate) ?? 0;
        this.nativeStreamEvaluationCount.set(evaluate, count + 1);
    }

    /** Set before to true if this request is happening just before a stream is evaluated */
    getNativeStreamFor(
        evaluate: EvaluatorNode,
        before: boolean = false
    ): Stream | undefined {
        const streams = this.nativeStreams.get(evaluate);
        const count =
            (this.nativeStreamEvaluationCount.get(evaluate) ?? 0) +
            (before ? 1 : 0);

        return streams === undefined || count === 0
            ? undefined
            : streams[count - 1];
    }

    addNativeStreamFor(evaluate: EvaluatorNode, stream: Stream): void {
        const streams = this.nativeStreams.get(evaluate) ?? [];

        // Remember the mapping
        this.nativeStreams.set(evaluate, [...streams, stream]);

        // Start the stream if this is reactive. Otherwise, we just take it's initial value.
        if (this.reactive) stream.start();

        // Listen to it so we can react to changes.
        stream.listen((stream) => this.react(stream));

        // If it's a temporal stream and we haven't already started a loop, start one.
        // Ensure we only start one by having an animation flag.
        if (stream instanceof TemporalStream) {
            this.nativeTemporalStreams.push(stream);
            // If we haven't yet started a loop, start one.
            if (
                !this.animating &&
                typeof window !== 'undefined' &&
                typeof window.requestAnimationFrame !== 'undefined'
            ) {
                this.animating = true;
                window.requestAnimationFrame(this.tick.bind(this));
            }
        }
    }

    updateTimeMultiplier(multiplier: number) {
        this.timeMultiplier = multiplier;
    }

    tick(time: DOMHighResTimeStamp) {
        // First time? Just record it.
        if (this.previousTime === undefined) this.previousTime = time;

        // Compute the delta and remember the previous time.
        const delta = time - this.previousTime;
        this.previousTime = time;

        // If we're in play mode, tick all the temporal streams.
        if (!this.isStepping()) {
            if (this.temporalReactions.length > 0)
                console.error(
                    "Hmmm, something is modifying temporal streams outside of the Evaluator's control. Tsk tsk!"
                );
            // Tick each one, indireclty filling this.temporalReactions.
            for (const stream of this.nativeTemporalStreams)
                stream.tick(time, delta, this.timeMultiplier);

            // If they changed, react.
            this.flush();
        }

        // Tick again in a bit if we're not stopped.
        if (!this.#stopped) window.requestAnimationFrame(this.tick.bind(this));
    }

    /** React with any pooled temporal reactions */
    flush() {
        // If they changed, react.
        if (this.temporalReactions.length > 0) {
            const changes = this.temporalReactions;
            this.temporalReactions = [];
            this.evaluate(changes);
        }
    }

    react(stream: Stream) {
        // If this is a temporal stream, pool it, letting tick() do a single project reaction.
        if (stream instanceof TemporalStream)
            this.temporalReactions.push(stream);
        // Otherwise, react immediately.
        else this.evaluate([stream]);
    }

    evaluate(changed: Stream[]) {
        // A stream changed!
        // STEP 1: Find the zero or more nodes that depend on this stream.
        let affectedExpressions: Set<Expression> = new Set();
        let streamReferences = new Set<Expression>();
        for (const stream of changed) {
            const streamNode = stream.creator;
            const affected = this.project.getExpressionsAffectedBy(streamNode);
            if (affected.size > 0) {
                for (const dependency of affected) {
                    affectedExpressions.add(dependency);
                    streamReferences.add(dependency);
                }
            }
        }

        // STEP 2: Traverse the dependency graphs of each source, finding all that directly or indirectly are affected by this stream's change.
        const affectedSources: Set<Source> = new Set();
        let unvisited = new Set(affectedExpressions);
        while (unvisited.size > 0) {
            for (const expr of unvisited) {
                // Remove from the visited list.
                unvisited.delete(expr);

                // Mark that the source was affected.
                const affectedSource = this.project
                    .getSources()
                    .find((source) => source.has(expr));
                if (affectedSource) affectedSources.add(affectedSource);

                const affected = this.project.getExpressionsAffectedBy(expr);
                // Visit all of the affected nodes.
                for (const newExpr of affected) {
                    // Avoid cycles
                    if (!affectedExpressions.has(newExpr)) {
                        affectedExpressions.add(newExpr);
                        unvisited.add(newExpr);
                    }
                }
            }
        }

        // STEP 3: After traversal, remove the stream references from the affected expressions; they will evaluate to the same thing, so they don't need to
        // be reevaluated.
        for (const streamRef of streamReferences)
            affectedExpressions.delete(streamRef);

        // STEP 4: Reevaluate the program
        this.start(changed);
    }

    /**
     * Given a node, walks its ancestors until it finds a node corresponding to a step.
     * Returns undefined if there is no such node.
     */
    getEvaluableNode(node: Node): Node | undefined {
        let current: Node | undefined = node;
        // step to node will just evaluate to the
        do {
            // If the node corresponds to a step
            if (this.nodeIsStep(current)) return current;
            else current = this.project.getRoot(current)?.getParent(current);
        } while (current !== undefined);
        return undefined;
    }

    // EVALUATION INTERFACE. Methods that Steps use to evaluate programs.

    /** Push a value on top of the current evaluation's stack. */
    pushValue(value: Value): void {
        if (this.evaluations.length > 0) this.evaluations[0].pushValue(value);
    }

    /** See the value on top. */
    hasValue(): boolean {
        return this.evaluations.length > 0 && this.evaluations[0].hasValue();
    }

    /** See the value on top. */
    peekValue(): Value | undefined {
        return this.evaluations[0]?.peekValue();
    }

    /** Get the value on the top of the stack. */
    popValue(requestor: Expression, expected?: Type): Value {
        return this.evaluations.length > 0
            ? this.evaluations[0].popValue(requestor, expected)
            : new ValueException(this, requestor);
    }

    /** Tell the current evaluation to jump to a new instruction. */
    jump(distance: number) {
        this.evaluations[0].jump(distance);
    }

    /** Tell the current evaluation to jump past the given expression */
    jumpPast(expression: Expression) {
        this.evaluations[0].jumpPast(expression);
    }

    /** Start evaluating the given function */
    startEvaluation(evaluation: Evaluation) {
        this.evaluations.unshift(evaluation);
    }

    /** Remove the evaluation from the stack, but remember it in case a step needs it (like a Borrow does, to access bindings) */
    endEvaluation(value: Value | undefined) {
        const evaluation = this.evaluations.shift();
        if (evaluation === undefined)
            throw Error(
                "Shouldn't be possible to end an evaluation on an empty evaluation stack."
            );
        this.#lastEvaluation = evaluation;
        const def = evaluation.getDefinition();
        if (def instanceof Source) {
            // If not in the past, save the source value.
            if (!this.isInPast()) {
                // Make a list if necessary
                let indexedValues = this.sourceValues.get(def) ?? [];
                // Add the entry
                indexedValues.push({ stepNumber: this.#stepCount, value });

                // Trim the history to the same length that streams are trimmed.
                const oldest = Math.max(
                    0,
                    indexedValues.length - MAX_STREAM_LENGTH
                );
                indexedValues = indexedValues.slice(
                    oldest,
                    oldest + MAX_STREAM_LENGTH
                );

                // Update the size
                this.sourceValueSize += value ? value.getSize() : 0;
                for (const removed of indexedValues.slice(0, oldest))
                    this.sourceValueSize -= removed.value
                        ? removed.value.getSize()
                        : 0;

                // Trim to source value max size to cap memory usage
                while (
                    this.sourceValueSize > MAX_SOURCE_VALUE_SIZE &&
                    indexedValues.length > 0
                ) {
                    this.sourceValueSize -=
                        indexedValues.shift()?.value?.getSize() ?? 0;
                }

                // Update the source value history
                this.sourceValues.set(def, indexedValues);
            }
        }
    }

    startExpression(_: Expression) {}

    saveExpressionValue(expression: Expression, value: Value) {
        // Remember the value it computed in the value history, if we haven't already recorded a value for this step index.
        const list = this.values.get(expression) ?? [];
        const index = this.getStepIndex();
        // If the list doesn't have a value for this index, save it.
        if (!list.some((v) => v.stepNumber === index)) {
            list.push({ value: value, stepNumber: index });
            this.values.set(expression, list);
        }
    }

    /** Bind the given value to the given name in the context of the current evaluation. */
    bind(names: Names, value: Value) {
        if (this.evaluations.length > 0) this.evaluations[0].bind(names, value);
    }

    /** Resolve the given name in the current execution context. */
    resolve(name: string | Names): Value | undefined {
        return this.evaluations[0].resolve(name);
    }

    /** A convenience function for evaluating a given function and inputs. */
    evaluateFunction(
        catalyst: EvaluatorNode,
        fun: FunctionDefinition,
        values: Value[]
    ): Value | undefined {
        // Do nothing if the function has no expression
        if (!(fun.expression instanceof Expression)) return undefined;

        // Construct the bindings.
        const bindings = new Map<Names, Value>();

        // Map each function input to a given value, bail if there aren't enough.
        for (const input of fun.inputs) {
            const nextValue = values.shift();
            if (nextValue === undefined) return undefined;
            bindings.set(input.names, nextValue);
        }

        // Create the evaluation.
        const frame = new Evaluation(this, catalyst, fun, undefined, bindings);

        // Start the evaluation.
        this.startEvaluation(frame);

        // Step until this is no longer on the stack.
        while (this.evaluations.includes(frame)) this.step();

        this.broadcast();

        // Return the latest value of the function's expression, and if it was a stream, it's latest value.
        return frame.peekValue();
    }

    /** Utility function for generating a missing value exception */
    getValueOrTypeException(
        expression: Expression,
        expected: Type,
        value: Value | Evaluation | undefined
    ) {
        return value === undefined || value instanceof Evaluation
            ? new ValueException(this, expression)
            : new TypeException(expression, this, expected, value);
    }
}
