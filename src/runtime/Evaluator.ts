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
import type NativeInterface from '../native/NativeInterface';
import Source from '@nodes/Source';
import type Names from '@nodes/Names';
import Expression from '@nodes/Expression';
import Project from '../models/Project';
import type Step from './Step';
import StructureDefinition from '@nodes/StructureDefinition';
import Token from '@nodes/Token';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Context from '@nodes/Context';

// Import this last, after everything else, to avoid cycles.
import Native from '../native/NativeBindings';
import { MAX_STREAM_LENGTH } from './Stream';
import Start from './Start';
import Finish from './Finish';
import EvaluationLimitException from './EvaluationLimitException';
import StepLimitException from './StepLimitException';
import TypeException from './TypeException';
import Random from '../input/Random';
import TemporalStream from './TemporalStream';

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

export enum Mode {
    PLAY,
    STEP,
}

export default class Evaluator {
    /** The project that this is evaluating. */
    readonly project: Project;

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
    #latestStepCount: number = 0;

    /** True if the last step was triggered by a step to a particular node. */
    #steppedToNode: boolean = false;

    /** The streams changes that triggered this evaluation */
    reactions: StreamChange[] = [];

    /** The expressions that need to be re-evaluated, if any. */
    invalidatedExpressions: Set<Expression> | undefined = undefined;

    /** All of the native streams created while evaluating the program */
    nativeStreams: Map<EvaluatorNode, Stream> = new Map();

    /** A derived cache of temporal streams, to avoid having to look them up. */
    nativeTemporalStreams: TemporalStream<any>[] = [];

    /** A mapping from Reaction nodes in the program to the streams they are listening to. */
    reactionStreams: Map<Reaction, Stream> = new Map();

    /** A set of possible execution modes, defaulting to play. */
    mode: Mode = Mode.PLAY;

    /** The value of each source, indexed by the step index at which it was created. */
    sourceValues: Map<Source, IndexedValue[]> = new Map();

    /**
     * An execution history, mapping Expressions to the sequence of values they have produced.
     * Used for avoiding reevaluation, as well as the front end for debugging.
     */
    values: Map<Expression, IndexedValue[]> = new Map();

    /**
     * A counter for each expression, tracking how many times it has executed. Used to retrieve
     * the correct prior Value from values/
     */
    counters: Map<Expression, number> = new Map();

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

    /**
     * A list of temporal streams that have updated, for pooling them into a single reevaluation,
     * rather than evaluating each at once. Reset in Evaluator.tick(), filled by Stream.add() broadcasting
     * to this Evaluator.
     */
    temporalReactions: Stream[] = [];

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

    constructor(project: Project) {
        this.project = project;

        // Create a global random number stream for APIs to use.
        this.random = new Random(this, undefined, undefined);

        // Set up start state.
        this.resetAll();
    }

    /**
     * Evaluates the given program and returns its value.
     * This is primarily used for testing.
     */
    static evaluateCode(
        main: string,
        supplements?: string[]
    ): Value | undefined {
        const source = new Source('test', main);
        const project = new Project(
            'test',
            source,
            (supplements ?? []).map(
                (code, index) => new Source(`sup${index + 1}`, code)
            )
        );
        project.evaluate();
        return project.evaluator.getLatestSourceValue(source);
    }

    // GETTERS

    getMain(): Source {
        return this.project.main;
    }
    getMode(): Mode {
        return this.mode;
    }
    getNative(): NativeInterface {
        return Native;
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
        const latestValue = indexedValues.findLast(
            (val) => val.stepNumber <= stepIndex
        );
        return latestValue === undefined ? undefined : latestValue.value;
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
            if (expression instanceof Token || expression === undefined)
                steps = [];
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

    getLatestValueOf(
        expression: Expression,
        stepNumber?: number
    ): Value | undefined {
        const values = this.values.get(expression);
        // No values? Return nothing.
        if (values === undefined || values.length === 0) return undefined;
        // No step number? Return the latest.
        if (stepNumber === undefined) return values[values.length - 1].value;
        // Step number? Find a value that occurred after the given step number.
        for (let index = values.length - 1; index >= 0; index--)
            if (values[index].stepNumber > stepNumber)
                return values[index].value;
        return undefined;
    }

    getCount(expression: Expression) {
        return this.counters.get(expression);
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
        return this.mode === Mode.PLAY;
    }
    isStepping(): boolean {
        return this.mode === Mode.STEP;
    }
    isDone() {
        return this.evaluations.length === 0;
    }
    getThis(requestor: Node): Value | undefined {
        return this.getCurrentEvaluation()?.getThis(requestor);
    }
    isInvalidated(expression: Expression) {
        return (
            this.invalidatedExpressions === undefined ||
            this.invalidatedExpressions.has(expression)
        );
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
    resetForEvaluation() {
        // Reset the latest expression values and counts.
        this.values.clear();
        this.counters.clear();

        // Reset the evluation stack.
        this.evaluations.length = 0;
        this.#lastEvaluation = undefined;

        // Didn't recently step to node.
        this.#steppedToNode = false;

        // Reset the streams resolved to avoid memory leaks.
        this.streamsResolved.clear();

        // Notify listeners.
        this.broadcast();
    }

    /** Reset all of the state, preparing for evaluation from the start of time. */
    resetAll() {
        // Mark as not started.
        this.#started = false;

        // Reset per-evaluation state.
        this.resetForEvaluation();

        // Reset the latest source values. (We keep them around for display after each reaction).
        this.sourceValues = new Map();
    }

    /** Evaluate until we're done */
    start(
        changedStreams?: Stream[],
        invalidatedExpressions?: Set<Expression>
    ): void {
        // Reset all state.
        this.resetForEvaluation();

        // Mark as started.
        this.#started = true;

        // Reset the recent step count to zero.
        this.#latestStepCount = 0;

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

        // Remember what expressions need to be reevaluated.
        this.invalidatedExpressions = invalidatedExpressions;

        // Erase the value history of all invalidated expressions.
        if (this.invalidatedExpressions)
            for (const expr of Array.from(this.invalidatedExpressions))
                this.values.delete(expr);

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
        this.setMode(Mode.PLAY);
        this.finish();
    }

    pause() {
        this.setMode(Mode.STEP);
        this.broadcast();
    }

    /** Stop execution, eliminate observers, and stop all streams. */
    stop() {
        this.#stopped = true;
        this.observers.length = 0;

        // Stop all native streams.
        Array.from(this.nativeStreams.values()).forEach((stream) =>
            stream.stop()
        );
    }

    /**
     * Evaluates the porgram until reaching a step on the specified node.
     * Evaluates to the end if there is no such step.
     */
    stepToNode(node: Node) {
        const previousMode = this.mode;
        this.mode = Mode.PLAY;
        while (!this.isDone() && this.getCurrentStep()?.node !== node)
            this.step();
        this.mode = previousMode;
        this.#steppedToNode = true;

        // Notify listeners that we tried to step to the node.
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
                      evaluation.getCreator(),
                      this.evaluations.map((e) => e.getDefinition())
                  )
                : // If it seems like we're evaluating something very time consuming, halt.
                this.#latestStepCount > MAX_STEP_COUNT
                ? new StepLimitException(this, evaluation.getCreator())
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
                const creator = evaluation.getCreator();
                // Remember the value that was evaluated. This usually happens in finishExpression, but happens here for evaluations.
                const list = this.values.get(creator) ?? [];
                list.push({ value: value, stepNumber: this.getStepIndex() });
                this.values.set(creator, list);
            }
            // Otherwise, save the value and clean up this final evaluation; nothing left to do!
            else this.end();
        }
        // If there was no value, that just means it's not done yet.

        // Finally, manage the step counter. Always increment the step index, and if we're in the present,
        // then also increment the step count.
        this.#stepIndex++;
        this.#latestStepCount++;

        if (!this.isInPast()) this.#stepCount = this.#stepIndex;
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
    stepBack(offset: number = -1) {
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
        this.resetForEvaluation();

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
        this.broadcast();

        return true;
    }

    /** Step back until reaching a step in the project. */
    stepBackWithinProgram() {
        let nextStepNode = undefined;
        do {
            // Step ahead
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

        if (change === undefined) return false;

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
        } else return false;
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
        return (
            this.reactions.findLast(
                (change) => change.stepIndex <= stepIndex
            ) ?? this.reactions[0]
        );
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
        return Array.from(this.nativeStreams.values()).filter(
            (stream): stream is Kind => stream instanceof type
        );
    }

    getNativeStreamFor(evaluate: EvaluatorNode): Stream | undefined {
        return this.nativeStreams.get(evaluate);
    }

    addNativeStreamFor(evaluate: EvaluatorNode, stream: Stream): void {
        // Remember the mapping
        this.nativeStreams.set(evaluate, stream);

        // Start the stream.
        stream.start();

        // Listen to it so we can react to changes.
        stream.listen((stream) => this.react(stream));

        // If it's a temporal stream and we haven't already started a loop, start one.
        if (stream instanceof TemporalStream) {
            this.nativeTemporalStreams.push(stream);
            // If we haven't yet started a loop, start one.
            if (
                this.previousTime === undefined &&
                typeof window !== 'undefined' &&
                typeof window.requestAnimationFrame !== 'undefined'
            )
                window.requestAnimationFrame(this.tick.bind(this));
        }
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
                stream.tick(time, delta);

            // If they changed, react.
            this.flush();
        }

        // Tick again in a bit.
        window.requestAnimationFrame(this.tick.bind(this));
    }

    /** React with any pooled temporal reactions */
    flush() {
        // If they changed, react.
        if (this.temporalReactions.length > 0) {
            this.project.react(this.temporalReactions);
            this.temporalReactions = [];
        }
    }

    react(stream: Stream) {
        // If this is a temporal stream, pool it, letting tick() do a single project reaction.
        if (stream instanceof TemporalStream)
            this.temporalReactions.push(stream);
        // Otherwise, react immediately.
        else this.project.react([stream]);
    }

    /**
     * Given a node, walks its ancestors until it finds a   node corresponding to a step.
     * Returns undefined if there is no such node.
     */
    getEvaluableNode(node: Node): Node | undefined {
        let current: Node | undefined = node;
        // step to node will just evaluate to the
        do {
            // If the node corresponds to a step
            if (this.nodeIsStep(current)) return current;
            else current = this.project.get(current)?.getParent();
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
                // Update the source value history
                this.sourceValues.set(def, indexedValues);
            }
        }
    }

    startExpression(expression: Expression) {
        if (!this.counters.has(expression)) this.counters.set(expression, 0);
        return this.getCount(expression);
    }

    finishExpression(
        expression: Expression,
        recycled: boolean,
        value?: Value | undefined
    ) {
        const count = this.counters.get(expression);
        if (count === undefined)
            throw Error(
                `It should never be possible than an expression hasn't started, but has finished, but this happened on ${expression
                    .toWordplay()
                    .trim()
                    .substring(0, 50)}...`
            );
        this.counters.set(expression, count + 1);

        // Remember the value it computed in the value history.
        if (!recycled) {
            const list = this.values.get(expression) ?? [];
            list.push({ value: value, stepNumber: this.getStepIndex() });
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
            : new TypeException(this, expected, value);
    }
}
