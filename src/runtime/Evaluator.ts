import type { ConflictContext } from "../nodes/Node";
import type Program from "../nodes/Program";
import type Reaction from "../nodes/Reaction";
import { parse } from "../parser/Parser";
import Evaluation from "./Evaluation";
import Exception, { ExceptionKind } from "./Exception";
import ReactionStream from "./ReactionStream";
import Shares, { DEFAULT_SHARES } from "./Shares";
import Stream from "./Stream";
import Value from "./Value";

// Import this last, after everything else.
import Native from "../native/NativeBindings";
import type NativeInterface from "../native/NativeInterface";

export default class Evaluator {

    readonly program: Program;

    /** This represents a stack of node evaluations. The first element of the stack is the currently executing node. */
    evaluations: Evaluation[] = [];

    /** The global namespace of shared code. */
    shares: Shares;

    /** True if stop() was called */
    stopped = false;

    /** The callback to notify if the program's value changes. */
    listener?: (value: Value | undefined) => void;

    /** The latest value computed. */
    result: Value | undefined;

    /** The streams that have been imported */
    borrowedStreams: Stream[] = [];

    /** The streams changes that triggered this evaluation */
    changedStreams: Stream[] = [];

    /** The streams accessed since the latest time requested */
    accessedStreams: Stream[] | undefined = undefined;

    /** A set of node streams */
    reactionStreams: Map<Reaction, Stream> = new Map();

    constructor(program: Program, listener?: (value: Value | undefined) => void) {

        this.program = program;
        this.evaluations = [];
        this.shares = new Shares(this);
        this.listener = listener;

        // Evaluate the first time
        this.evaluate([]);

    }

    static evaluateCode(code: string): Value | undefined {
        const evaluator = new Evaluator(parse(code));
        const result = evaluator.evaluate([]);
        evaluator.stop();
        return result;
    }

    getContext(): ConflictContext { return { program: this.program, shares: this.shares, native: Native, stack: [] }; }

    getNative(): NativeInterface { return Native; }

    react(stream: Stream) {
        // Reevaluate everything in case it has Reactions that are dependent on the stream. 
        // We can be smarter about this in the future, updating those specific expressions and their downstream dependencies.
        const result = this.evaluate([ stream ]);

        if(this.listener !== undefined)
            this.listener.call(undefined, result);
    }

    /** Initializes the evaluator for execution. */
    start() {
        // Start executing the program node.
        this.evaluations = [ new Evaluation(this, this.program, this.program) ];

        // Borrow all of the implicit borrows.
        Object.keys(DEFAULT_SHARES).forEach(name => this.borrow(name));

        // Stop remembering in case the last execution ended abruptly.
        this.stopRememberingStreamAccesses();
    }

    /** Stops listening to listeners and halts execution. */
    stop() {
        // Stop all borrowed streams and stop listening to them.
        this.borrowedStreams.forEach(stream => {
            stream.stop();
            stream.ignore(this.react);
        });
        this.stopped = true;
    }

    /** Advance one step in execution. Returns false if there's nothing left to execute. */
    step(): Value | undefined {

        // If it seems like we're stuck in an infinite (recursive) loop, halt.
        if(this.evaluations.length > 100000)
            return new Exception(this.program, ExceptionKind.POSSIBLE_INFINITE_RECURSION);

        // If there's no node evaluating, we're done.
        if(this.evaluations.length === 0)
            return new Exception(this.program, ExceptionKind.EXPECTED_CONTEXT);

        const evaluation = this.evaluations[0];

        // Evaluate the node.
        const result = evaluation.step(this);

        // If it's an exception, halt execution.
        if(result instanceof Exception)
            return result;
        // If it's a value, pop the evaluation off the stack and add the value to the 
        // vaule stack of the new top of the stack.
        else if(result instanceof Value) {
            this.endEvaluation();
            if(this.evaluations.length > 0)
                this.evaluations[0].pushValue(result);
            else return result;
        }
        // Otherwise, just keep steppin'

    }

    /** Evaluate until we're done */
    evaluate(changedStreams: Stream[]): Value | undefined{

        this.changedStreams = changedStreams;

        // Initialize for execution
        this.start();

        // Run all of the steps until we get a value.
        while(!this.stopped) {
            const value = this.step();
            if(value !== undefined) {
                this.result = value;
                break;
            }
        }

        // Notify the listener of the result.
        if(this.listener !== undefined)
            this.listener.call(undefined, this.result);

        // Return the result.
        return this.result;

    }

    /** Get whatever the latest result was of evaluating the program and its streams. */
    getResult() { return this.result; }

    /** Push a value on top of the current evaluation's stack. */
    pushValue(value: Value): void { 
        if(this.evaluations.length > 0)
            this.evaluations[0].pushValue(value);
    }
    
    /** Get the value on the top of the stack. */
    popValue(): Value { 
        return this.evaluations.length > 0 ? 
            this.evaluations[0].popValue() : 
            new Exception(this.program, ExceptionKind.EXPECTED_VALUE);
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
    
    /** Borrow the given name from the global namespace. */
    borrow(name: string, version?: number): Exception | undefined { 

        // Find the shared thing
        const share = this.shares.resolve(name, version);
        if(share === undefined) return new Exception(this.program, ExceptionKind.UNKNOWN_SHARE);

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
            const newStream = new ReactionStream(reaction, value);
            this.reactionStreams.set(reaction, newStream);
        }
    }

}