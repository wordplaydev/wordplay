import Node from "../nodes/Node";
import type Reaction from "../nodes/Reaction";
import Evaluation, { type EvaluationNode } from "./Evaluation";
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
import Start from "./Start";
import type Step from "./Step";
import Block from "../nodes/Block";
import StructureDefinition from "../nodes/StructureDefinition";
import Token from "../nodes/Token";
import FunctionDefinition from "../nodes/FunctionDefinition";
import ConversionDefinition from "../nodes/ConversionDefinition";

// Import this last, after everything else, to avoid cycles.
import Native from "../native/NativeBindings";

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
    ignoredStreams: Set<Stream> = new Set();

    /** A set of possible execution modes, defaulting to play. */
    mode: Mode = Mode.PLAY;

    /** 
     * An execution history, mapping Expressions to the sequence of values they have produced.
     * Used for avoiding reevaluation, as well as the front end for debugging.
     */
    values: Map<Expression, (Value | undefined)[]> = new Map();

    /** 
     * A counter for each expression, tracking how many times it has executed. Used to retrieve
     * the correct prior Value from values/
     */
    counters: Map<Expression, number> = new Map();

    /**
     * A cache of steps by node.
     */
    steps: Map<EvaluationNode, Step[]> = new Map();

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
        return project.getEvaluator(source).getLatestResult();
    }

    // GETTERS

    getMode(): Mode { return this.mode; }
    getProgram(): Program { return this.source.expression; }
    getContext(): Context { return this.context; }
    getNative(): NativeInterface { return Native; }
    getCurrentStep() { return this.evaluations[0]?.currentStep(); }
    getNextStep() { return this.evaluations[0]?.nextStep(); }
    getCurrentEvaluation() { return this.evaluations.length === 0 ? undefined : this.evaluations[0]; }
    getShares() { return this.shares; }
    /** Get whatever the latest result was of evaluating the program and its streams. */
    getLatestResult() { return this.latestValue; }
    getVerse() { return valueToVerse(this, this.getLatestResult()); }
    getSteps(evaluation: EvaluationNode): Step[] {

        // No expression? No steps.
        let steps = this.steps.get(evaluation);
        if(steps === undefined) {
            // If the evaluation is a structure definition that has no block, synthesize an empty block
            const expression = 
                evaluation instanceof StructureDefinition && evaluation.expression === undefined ? new Block([], true, true) :
                evaluation.expression;
            steps = expression instanceof Token || expression === undefined ? [] : expression.compile(this.context);
            this.steps.set(evaluation, steps);
        }
        return steps;

    }
    getPriorValueOf(expression: Expression, count: number) {
        const values = this.values.get(expression);
        return values === undefined || count >= values.length ? undefined : values[count];
    }
    getCount(expression: Expression) {
        return this.counters.get(expression);
    }

    // PREDICATES

    isPlaying(): boolean { return this.mode === Mode.PLAY; }
    isStepping(): boolean { return this.mode === Mode.STEP; }
    isEvaluating() { return this.evaluations.length > 0 || this.latestValue !== undefined; }
    isDone() { return this.evaluations.length === 0; }
    getThis(requestor: Node): Value | undefined { return this.getCurrentEvaluation()?.getThis(requestor); }
    isInvalidated(expression: Expression) { return this.invalidatedExpressions === undefined || this.invalidatedExpressions.has(expression); }

    /** Given a node, returns true if the node participates in a step in this program. */
    nodeIsStep(node: Node): boolean {

        // Find evaluable nodes and see if their steps 
        // so we can analyze them for various purposes.
        for(const evaluation of this.source.nodes()) {
            if(evaluation instanceof FunctionDefinition ||
                evaluation instanceof StructureDefinition ||
                evaluation instanceof ConversionDefinition ||
                evaluation instanceof Source) {

                const steps = this.getSteps(evaluation);
                const step = steps.find(step => step.node === node);
                if(step !== undefined) return true;

            }
        }
        return false;

    }

    // CONTROLS

    setMode(mode: Mode) {
        this.mode = mode;
        this.broadcast();
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
        this.evaluations.push(new Evaluation(this, this.source, this.source));

        // Stop remembering in case the last execution ended abruptly.
        this.stopRememberingStreamAccesses();

        // Tell listeners that we started.
        this.broadcast();

        // If in play mode, we finish.
        if(this.isPlaying())
            this.finish();

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

    /** Stops listening to listeners and halts execution. */
    stop() {
        this.stopped = true;
        this.observers.length = 0;
    }

    /** 
     * Evaluates the porgram until reaching a step on the specified node. 
     * Evaluates to the end if there is no such step.
     */
     stepToNode(node: Node) {

        while(this.getCurrentStep() !== undefined && this.getCurrentStep()?.node !== node)
            this.step();

    }

    /** Keep evaluating steps in this project until out of the current evaluation. */
    stepOut(): void {
        const currentEvaluation = this.evaluations[0];
        if(currentEvaluation === undefined) return;
        while(this.evaluations.length > 0 && currentEvaluation === this.evaluations[0])
            this.stepWithinProgram();
    }

    finish(): void {

        // Run all of the steps until we get a value or we're stopped.
        while(!this.stopped && !this.isDone())
            this.step();
            
    }

    end(value: Value) {

        // Save the value.
        this.latestValue = value;
        // Notify observers.
        this.broadcast();
        
    }

    /** 
     * Advance one step in execution. 
     * Return any exceptions or the final value when there's nothing left to execute. 
     * Otherwise, return undefined, as a signal that we're still stepping.
     **/
    step(): void {

        // If there's no node evaluating, do nothing.
        if(this.evaluations.length === 0)
            return;

        // Get the value of the next step of the current evaluation.
        const value = 
            // If it seems like we're stuck in an infinite (recursive) loop, halt.
            this.evaluations.length > 100000 ? new EvaluationException(StackSize.FULL, this) :
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
        this.ignoredStreams.clear();

    }

    /** Keep evaluating steps in this project, skipping over nodes in other programs. */
    stepWithinProgram(): void {

        let nextStepNode = undefined;
        do {
            this.step();
            nextStepNode = this.getCurrentStep()?.node;
        } while(nextStepNode instanceof Node && !this.source.expression.contains(nextStepNode));

        // If we're on a start and the next step is a finish for the same node, step.
        if(this.getCurrentStep() instanceof Start && this.getCurrentStep().node === this.getNextStep()?.node)
            this.step();

    }
    
    // OBSERVERS

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

    // STREAM MANAGMEENT

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

    ignoredStream(stream: Stream) {
        // Does the root evaluation bind this stream? If so, note that we ignored it.
        if(this.evaluations[this.evaluations.length - 1]?.binds(stream)) {
            this.ignoredStreams.add(stream);
            this.broadcast();
        }
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



    /** 
     * Given a node, walks its ancestors until it finds a node corresponding to a step.
     * Returns undefined if there is no such node.
     */
    getEvaluableNode(node: Node): Node | undefined {

        let current: Node | undefined = node;
        // step to node will just evaluate to the
        do {
            // If the node corresponds to a step
            if(this.nodeIsStep(current))
                return current;
            else
                current = this.context.get(current)?.getParent();
        } while(current !== undefined);
        return undefined;

    }

    // EVALUATION INTERFACE. Methods that Steps use to evaluate programs.

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
    
    startEvaluation(evaluation: Evaluation) {
        this.evaluations.unshift(evaluation);
    }

    /** Start evaluation */
    endEvaluation() {
        this.evaluations.shift();
    }
    
    startEvaluating(expression: Expression) {
        if(!this.counters.has(expression))
            this.counters.set(expression, 0);
        return this.getCount(expression);
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

    /** Bind the given value to the given name in the context of the current evaluation. */
    bind(names: Names, value: Value) {
        if(this.evaluations.length > 0)
            this.evaluations[0].bind(names, value);
    }

    /** Resolve the given name in the current execution context. */
    resolve(name: string | Names): Value | undefined {
        const value = 
            this.evaluations.length === 0 ? 
                undefined : 
                this.evaluations[0].resolve(name);

        if(value) return value;

        return typeof name === "string" ? this.shares.resolve(name) : undefined;

    }

    /** Borrow the given name from the other source in this project or from the global namespace. */
    borrow(name: string): Value | undefined { 

        // First look in this source's shares (for global things) then look in other source.
        // (Otherwise we'll find the other source's streams, which are separate).
        const share = this.shares.resolve(name) ?? this.context.project.resolveShare(this.source, name);
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
    
    /** Share the given value */
    share(names: Names, value: Value) { 
        return this.shares.bind(names, value);
    }

    resolveShare(name: string): Value | undefined {
        return this.shares.resolve(name);
    }
    
}