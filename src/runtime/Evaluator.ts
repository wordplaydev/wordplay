import Node from "../nodes/Node";
import type Reaction from "../nodes/Reaction";
import Evaluation from "./Evaluation";
import ReactionStream from "./ReactionStream";
import Shares, { DEFAULT_SHARES } from "./Shares";
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
import type Step from "./Step";
import Source from "../models/Source";
import type Program from "../nodes/Program";

/** Anything that wants to listen to changes in the state of this evaluator */
export type EvaluationObserver = {
    stepped: (step: Step) => void,
    ended: (value: Value | undefined) => void
};

export type EvaluationMode = "play" | "step";

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

    /** The streams that have been imported */
    readonly borrowedStreams: Stream[] = [];

    /** The streams changes that triggered this evaluation */
    changedStreams: Stream[] = [];

    /** The streams accessed since the latest time requested */
    accessedStreams: Stream[] | undefined = undefined;

    /** A mapping from Reaction nodes in the program to the streams they are listening to. */
    reactionStreams: Map<Reaction, Stream> = new Map();

    /** A queue of streams that have been modified. */
    reactionQueue: Stream[] = [];

    /** A set of the streams ignored while stepping. Reset once played. */
    streamsIgnoredDuringStepping: Set<Stream> = new Set();

    constructor(source: Source) {

        this.source = source;
        this.evaluations = [];
        this.shares = new Shares(this);
        this.context = new Context(this.source, this.source.program, this.shares, Native);

    }

    /**
     * Evaluates the given program and returns its value.
     * This is primarily used for testing.
     */
    static evaluateCode(code: string): Value | undefined {
        // Evaluate the program.
        const evaluator = new Evaluator(new Source("test", code));
        // Start the evaluation
        evaluator.start([]);
        // Stop the streams.
        evaluator.stop();
        // Return the result.
        return evaluator.getLatestResult();
    }

    isPlaying(): boolean { return this.source.mode === "play"; }

    getSource(): Source { return this.source; }

    getProgram(): Program { return this.source.program; }

    getContext(): Context { return this.context; }

    getNative(): NativeInterface { return Native; }

    ignoredStream(stream: Stream) {
        // Does the root evaluation bind this stream? If so, note that we ignored it.
        if(this.evaluations[this.evaluations.length - 1]?.binds(stream)) {
            this.streamsIgnoredDuringStepping.add(stream);
            this.broadcastStep();    
        }
    }

    react(stream: Stream) {

        // Add this stream to the reaction queue.
        this.reactionQueue.push(stream);

        // If the program isn't evaluating, dequeue a reaction.
        this.dequeueReaction();

    }

    observe(observer: EvaluationObserver) { this.observers.push(observer); }
    ignore(observer: EvaluationObserver) { 
        const index = this.observers.indexOf(observer);
        if(index >= 0)
            this.observers.splice(index, 1);
    }

    broadcastStep() {
        const step = this.currentStep();
        if(step !== undefined) 
            this.observers.forEach(observer => observer.stepped(step));
    }

    broadcastEnd() {
        // Notify the observers of the final evaluation value.
        this.observers.forEach(observer => observer.ended(this.latestValue));
    }

    /** True if the evaluation stack is empty. */
    isDone() { return this.evaluations.length === 0; }

    /** Stops listening to listeners and halts execution. */
    stop() {

        // Stop all borrowed streams and stop listening to them.
        this.borrowedStreams.forEach(stream => {
            stream.stop();
            stream.ignore(this.react);
        });
        this.stopped = true;

        this.observers.length = 0;
        
    }

    /** 
     * Advance one step in execution. 
     * Return any exceptions or the final value when there's nothing left to execute. 
     * Otherwise, return undefined, as a signal that we're still stepping.
     **/
    step(): void {

        const value = 
            // If it seems like we're stuck in an infinite (recursive) loop, halt.
            this.evaluations.length > 100000 ? new EvaluationException(this, StackSize.FULL) :
            // If there's no node evaluating, throw an exception
            // It's up to callers to check before calling step on a finished evaluation.
            this.evaluations.length === 0 ? new EvaluationException(this, StackSize.EMPTY) :
            // Otherwise, step the current evaluation and get it's value
            this.evaluations[0]?.step(this);

        // Tell observers that we're stepping
        this.broadcastStep();

        // If it's an exception, halt execution by returning the exception value.
        if(value instanceof Exception)
            this.end(value);
        // If it's another kind of value, pop the evaluation off the stack and add the value to the 
        // value stack of the new top of the stack.
        if(value instanceof Value) {
            this.endEvaluation();
            // If there's an evaluation on the stack, pass the value to it and return undefined.
            if(this.evaluations.length > 0)
                this.evaluations[0].pushValue(value);
            // Otherwise, save the value and clean up this evaluation.
            else
                this.end(value);
        }

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
    start(changedStreams: Stream[]): void {

        this.changedStreams = changedStreams;

        // Reset the evluation stack and start evaluating the the program.
        this.evaluations.length = 0;
        this.evaluations.push(new Evaluation(this, this.source.program, this.source.program));

        // Borrow all of the implicit borrows.
        Object.keys(DEFAULT_SHARES).forEach(name => this.borrow(name));

        // Stop remembering in case the last execution ended abruptly.
        this.stopRememberingStreamAccesses();

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

        // React to any pending stream changes.
        this.dequeueReaction();
        
    }

    currentStep() { 
        return this.evaluations[0]?.currentStep();
    }

    /** If the program isn't done, do nothing. If it is, start a new execution, handling the changed stream. */
    dequeueReaction() {
        
        if(!this.isDone()) return;
        const stream = this.reactionQueue.shift();
        if(stream === undefined) return;
        
        this.start([ stream ]);

    }

    /** Cache the evaluation's result and notify listeners of it. */
    saveResult(value: Value) {

        this.latestValue = value;

        this.broadcastEnd();
    
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

    /** Start evaluation */
    endEvaluation() {
        this.evaluations.shift();
    }
    
    /** Start evaluation */
    startEvaluation(evaluation: Evaluation) {
        this.evaluations.unshift(evaluation);
    }

    /** Bind the given value to the given name in the context of the current evaluation. */
    bind(name: string, value: Value) {
        if(this.evaluations.length > 0)
            this.evaluations[0].bind(name, value);
    }

    /** Resolve the given name in the current execution context. */
    resolve(name: string): Value | undefined {
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

    getShares() { return this.shares; }

    /** Share the given value */
    share(name: string, value: Value) { 
        return this.shares.bind(name, value);
    }

    resolveShare(name: string): Value | undefined {
        return this.shares.resolve(name);
    }

    /** Borrow the given name from the other source in this project or from the global namespace. */
    borrow(name: string): Value | undefined { 

        // First look in this source's shares (for global things) then look in other source.
        // (Otherwise we'll find the other source's streams, which are separate).
        const share = this.shares.resolve(name) ?? this.getSource().getProject()?.resolveShare(this.getSource(), name);
        if(share === undefined) return new NameException(this, name);

        // If we've already borrowed this, don't do it again.
        if(this.resolve(name) === share)
            return undefined;

        // Bind the shared value in this context.
        this.bind(name, share);

        // If it's a stream we haven't started, start and listen to the stream.
        if(share instanceof Stream && !this.borrowedStreams.includes(share)) {
            this.borrowedStreams.push(share);
            share.listen(this.react.bind(this));
            share.start();
        };

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
        return this.changedStreams.indexOf(stream) >= 0;
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
            const newStream = new ReactionStream(this, reaction, value);
            this.reactionStreams.set(reaction, newStream);
        }
    }

}