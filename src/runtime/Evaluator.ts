import Node from "../nodes/Node";
import type Reaction from "../nodes/Reaction";
import Evaluation from "./Evaluation";
import ReactionStream from "./ReactionStream";
import Shares from "./Shares";
import Stream from "./Stream";
import Value from "./Value";
import Context from "../nodes/Context";
import EvaluationException, { StackSize } from "./ContextException";
import Exception from "./Exception";
import NameException from "./NameException";
import ValueException from "./ValueException";
import type Type from "../nodes/Type";

// Import this last, after everything else, to avoid cycles.
import Native from "../native/NativeBindings";
import type NativeInterface from "../native/NativeInterface";
import Source from "../models/Source";
import type Program from "../nodes/Program";
import Names from "../nodes/Names";
import Name from "../nodes/Name";
import type Expression from "../nodes/Expression";
import Evaluate from "../nodes/Evaluate";
import BinaryOperation from "../nodes/BinaryOperation";
import UnaryOperation from "../nodes/UnaryOperation";
import Project from "../models/Project";
import { valueToVerse } from "../native/Verse";

/** Anything that wants to listen to changes in the state of this evaluator */
export type EvaluationObserver = () => void;

export enum Mode { PLAY, STEP };

export default class Evaluator {

    readonly source: Source;

    /** This represents a stack of node evaluations. The first element of the stack is the currently executing node. */
    readonly evaluations: Evaluation[] = [];

    /** The global namespace of shared code. */
    readonly shares: Shares;

    /** The conflict context for compilation and type checking. */
    readonly context: Context;

    /** The callback to notify if the evaluation's value changes. */
    readonly observers: EvaluationObserver[] = [];

    /** True if stop() was called */
    stopped = false;

    /** The value of the evaluted program, cached each time the program is evaluated. */
    latestValue: Value | undefined;

    /** The streams changes that triggered this evaluation */
    changedStream: Stream | undefined;

    /** The expressions that need to be re-evaluated, if any. */
    invalidatedExpressions: Set<Expression> | undefined = undefined;

    /** The streams accessed since the latest time requested */
    accessedStreams: Stream[] | undefined = undefined;

    /** A mapping from Reaction nodes in the program to the streams they are listening to. */
    reactionStreams: Map<Reaction, Stream> = new Map();

    /** A set of the streams ignored while stepping. Reset once played. */
    streamsIgnoredDuringStepping: Set<Stream> = new Set();

    /** A set of possible execution modes, defaulting to play. */
    mode: Mode = Mode.PLAY;

    /** 
     * An execution history, mapping Expressions to the sequence of values they have produced.
     * Used for avoiding reevaluation, as well as the front end for debugging.
     */
    values: Map<Expression, (Value | undefined)[]> = new Map();

    /** A counter for each expression, tracking how many times it has executed. Used to retrieve
     * the correct prior Value from values/
     */
    counters: Map<Expression, number> = new Map();

    constructor(project: Project, source: Source) {

        this.source = source;
        this.evaluations = [];
        this.shares = new Shares();
        this.context = new Context(project, this.source, this.shares);

    }

    /**
     * Evaluates the given program and returns its value.
     * This is primarily used for testing.
     */
    static evaluateCode(main: string, supplements?: string[]): Value | undefined {
        const source = new Source("test", main);
        const project = new Project("test", source, (supplements ?? []).map((code, index) => new Source(`sup${index + 1}`, code)));
        project.evaluate();
        return project.getEvaluator(source)?.getLatestResult();
    }

    play() {
        this.setMode(Mode.PLAY);
        this.finish();
    }

    pause() {
        this.setMode(Mode.STEP);
        this.finish();
        this.start();
    }

    setMode(mode: Mode) {
        this.mode = mode;
        this.broadcast();
    }

    isPlaying(): boolean { return this.mode === Mode.PLAY; }
    isStepping(): boolean { return this.mode === Mode.STEP; }

    getSource(): Source { return this.source; }

    getProgram(): Program { return this.source.program; }

    getContext(): Context { return this.context; }

    getNative(): NativeInterface { return Native; }

    getThis(requestor: Node): Value | undefined { return this.getEvaluationContext()?.getThis(requestor); }

    ignoredStream(stream: Stream) {
        // Does the root evaluation bind this stream? If so, note that we ignored it.
        if(this.evaluations[this.evaluations.length - 1]?.binds(stream)) {
            this.streamsIgnoredDuringStepping.add(stream);
            this.broadcast();
        }
    }

    observe(observer: EvaluationObserver) { 
        this.observers.push(observer); 
    }

    ignore(observer: EvaluationObserver) { 
        const index = this.observers.indexOf(observer);
        if(index >= 0)
            this.observers.splice(index, 1);
    }

    broadcast() {
        this.observers.forEach(observer => observer());
    }

    isEvaluating() { return this.evaluations.length > 0 || this.latestValue !== undefined; }

    /** True if the evaluation stack is empty. */
    isDone() { return this.evaluations.length === 0; }

    /** Stops listening to listeners and halts execution. */
    stop() {
        this.stopped = true;
        this.observers.length = 0;
    }

    /** 
     * Advance one step in execution. 
     * Return any exceptions or the final value when there's nothing left to execute. 
     * Otherwise, return undefined, as a signal that we're still stepping.
     **/
    step(): void {

        // Get the value of the next step of the current evaluation.
        const value = 
            // If it seems like we're stuck in an infinite (recursive) loop, halt.
            this.evaluations.length > 100000 ? new EvaluationException(StackSize.FULL, this) :
            // If there's no node evaluating, throw an exception
            // It's up to callers to check before calling step on a finished evaluation.
            this.evaluations.length === 0 ? new EvaluationException(StackSize.EMPTY, this) :
            // Otherwise, step the current evaluation and get it's value
            this.evaluations[0]?.step(this);

        // Tell observers that we're stepping
        this.broadcast();

        // If it's an exception, halt execution by returning the exception value.
        if(value instanceof Exception)
            this.end(value);
        // If it's another kind of value, pop the evaluation off the stack and add the value to the 
        // value stack of the new top of the stack.
        if(value instanceof Value) {
            // End the Evaluation
            this.endEvaluation();
            // If there's another Evaluation on the stack, pass the value to it by pushing it onto it's stack.
            if(this.evaluations.length > 0) {
                this.evaluations[0].pushValue(value);
                const priorStep = this.evaluations[0].priorStep();
                if(priorStep && (priorStep.node instanceof Evaluate || priorStep.node instanceof BinaryOperation || priorStep.node instanceof UnaryOperation)) {
                    const list = this.values.get(priorStep.node) ?? [];
                    list.push(value);
                    this.values.set(priorStep.node, list);
                }
            }
            // Otherwise, save the value and clean up this final evaluation; nothing left to do!
            else
                this.end(value);
        }
        // If there was no value, that just means it's not done yet.

        // Clear the ignored reactions after this step, assuming the creator was notified.
        this.streamsIgnoredDuringStepping.clear();

    }

    /** Keep evaluating steps in this project, skipping over nodes in other programs. */
    stepWithinProgram(): void {

        let nextStepNode = undefined;
        do {
            this.step();
            nextStepNode = this.currentStep()?.node;
        } while(nextStepNode instanceof Node && !this.source.program.contains(nextStepNode));

    }

    /** Keep evaluating steps in this project until out of the current evaluation. */
    stepOut(): void {
        const currentEvaluation = this.evaluations[0];
        if(currentEvaluation === undefined) return;
        while(this.evaluations.length > 0 && currentEvaluation === this.evaluations[0])
            this.stepWithinProgram();
    }

    /** Evaluate until we're done */
    start(changedStream?: Stream, invalidatedExpressions?: Set<Expression>): void {

        // Reset the latest value.
        this.latestValue = undefined;

        // Remember what streams changed.
        this.changedStream = changedStream;

        // Remember what expressions need to be reevaluated.
        this.invalidatedExpressions = invalidatedExpressions;

        // Erase the value history of all invalidated expressions.
        if(this.invalidatedExpressions)
            for(const expr of Array.from(this.invalidatedExpressions))
                this.values.delete(expr);

        // Start over counting expression evaluations.
        this.counters.clear();

        // Reset the evluation stack and start evaluating the the program.
        this.evaluations.length = 0;
        this.evaluations.push(new Evaluation(this, this.source.program, this.source.program, this.source.program));

        // Add the default shares to make them borrowable.
        Object.keys(this.shares.getDefaultShares()).forEach(name => this.borrow(name));

        // Stop remembering in case the last execution ended abruptly.
        this.stopRememberingStreamAccesses();

        // Tell listeners that we started.
        this.broadcast();

        // If in play mode, we finish.
        if(this.isPlaying())
            this.finish();

    }

    finish(): void {

        // Run all of the steps until we get a value or we're stopped.
        while(!this.stopped && !this.isDone())
            this.step();
            
    }

    end(value: Value) {

        // Save the value.
        this.saveResult(value);
        
    }

    currentStep() { 
        return this.evaluations[0]?.currentStep();
    }

    /** Cache the evaluation's result and notify listeners of it. */
    saveResult(value: Value) {

        this.latestValue = value;

        this.broadcast();
    
    }

    /** Get whatever the latest result was of evaluating the program and its streams. */
    getLatestResult() { return this.latestValue; }

    /** Push a value on top of the current evaluation's stack. */
    pushValue(value: Value): void { 
        if(this.evaluations.length > 0)
            this.evaluations[0].pushValue(value);
    }

    /** See the value on top. */
    hasValue(): boolean { 
        return this.evaluations.length > 0 && this.evaluations[0].hasValue();
    }
    
    /** See the value on top. */
    peekValue(): Value { 
        return this.evaluations.length > 0 ? 
            this.evaluations[0].peekValue() : 
            new ValueException(this);
    }

    /** Get the value on the top of the stack. */
    popValue(expected: Type | undefined): Value { 
        return this.evaluations.length > 0 ? 
            this.evaluations[0].popValue(expected) : 
            new ValueException(this);
    }

    /** Tell the current evaluation to jump to a new instruction. */
    jump(distance: number) {
        this.evaluations[0].jump(distance);
    }

    /** Tell the current evaluation to jump past the given expression */
    jumpPast(expression: Expression) {
        this.evaluations[0].jumpPast(expression);
    }

    /** Start evaluation */
    endEvaluation() {
        this.evaluations.shift();
    }
    
    /** Start evaluation */
    startEvaluation(evaluation: Evaluation) {
        this.evaluations.unshift(evaluation);
    }

    /** Bind the given value to the given name in the context of the current evaluation. */
    bind(names: Names, value: Value) {
        if(this.evaluations.length > 0)
            this.evaluations[0].bind(names, value);
    }

    /** Resolve the given name in the current execution context. */
    resolve(name: string | Names): Value | undefined {
        return this.evaluations.length === 0 ? 
            undefined : 
            this.evaluations[0].resolve(name);

    }

    /** Get the context of the currently evaluating evaluation. */
    getEvaluationContext() {
        return this.evaluations.length === 0 ? 
            undefined :
            this.evaluations[0];
    }

    getCurrentStep() { return this.getEvaluationContext()?.currentStep(); }

    getShares() { return this.shares; }

    /** Share the given value */
    share(names: Names, value: Value) { 
        return this.shares.bind(names, value);
    }

    resolveShare(name: string): Value | undefined {
        return this.shares.resolve(name);
    }

    /** Borrow the given name from the other source in this project or from the global namespace. */
    borrow(name: string): Value | undefined { 

        // First look in this source's shares (for global things) then look in other source.
        // (Otherwise we'll find the other source's streams, which are separate).
        const share = this.shares.resolve(name) ?? this.context.project.resolveShare(this.getSource(), name);
        if(share === undefined)
            return new NameException(name, this);

        // Bind the shared value in this context.
        this.bind(new Names([ new Name(name) ]), share);

        // If it's a stream, start it.
        if(share instanceof Stream)
            share.start();

        // Return the value.
        return share;

    }
    
    startRememberingStreamAccesses() {
        this.accessedStreams = [];
    }

    rememberStreamAccess(stream: Stream) {
        this.accessedStreams?.push(stream);
    }

    stopRememberingStreamAccesses(): Stream[] | undefined {
        const accessedStreams = this.accessedStreams;
        this.accessedStreams = undefined;
        return accessedStreams;
    }

    streamChanged(stream: Stream) {
        return this.changedStream === stream;
    }

    isInvalidated(expression: Expression) {
        return this.invalidatedExpressions === undefined || this.invalidatedExpressions.has(expression);
    }

    startEvaluating(expression: Expression) {
        if(!this.counters.has(expression))
            this.counters.set(expression, 0);
        return this.getCount(expression);
    }

    getCount(expression: Expression) {
        return this.counters.get(expression);
    }

    finishEvaluating(expression: Expression, recycled: boolean, value?: Value | undefined) {

        const count = this.counters.get(expression);
        if(count === undefined)
            throw Error(`It should never be possible than an expression hasn't started, but has finished, but this happened on ${expression.toWordplay().trim().substring(0, 50)}...`);
        this.counters.set(expression, count + 1);

        // Remember the value it computed in the value history.
        if(!recycled) {
            const list = this.values.get(expression) ?? [];
            list.push(value);
            this.values.set(expression, list);
        }

    }

    getPriorValueOf(expression: Expression, count: number) {
        const values = this.values.get(expression);
        return values === undefined || count >= values.length ? undefined : values[count];
    }

    hasReactionStream(reaction: Reaction) {
        return this.reactionStreams.has(reaction);
    }

    getReactionStreamLatest(reaction: Reaction): Value | undefined {
        return this.reactionStreams.get(reaction)?.latest();
    }

    addToReactionStream(reaction: Reaction, value: Value) {
        if(this.hasReactionStream(reaction))
            this.reactionStreams.get(reaction)?.add(value);
        else {
            const newStream = new ReactionStream(reaction, value);
            this.reactionStreams.set(reaction, newStream);
        }
    }

    getVerse() {         
        const value = this.getLatestResult();
        return valueToVerse(this, value);
    }

}