import type Node from "../nodes/Node";
import type Reaction from "../nodes/Reaction";
import Evaluation, { type EvaluationNode } from "./Evaluation";
import ReactionStream from "./ReactionStream";
import type Stream from "./Stream";
import Value from "./Value";
import EvaluationException, { StackSize } from "./ContextException";
import Exception from "./Exception";
import ValueException from "./ValueException";
import type Type from "../nodes/Type";
import type NativeInterface from "../native/NativeInterface";
import Source from "../models/Source";
import type Names from "../nodes/Names";
import type Expression from "../nodes/Expression";
import Evaluate from "../nodes/Evaluate";
import BinaryOperation from "../nodes/BinaryOperation";
import UnaryOperation from "../nodes/UnaryOperation";
import Project from "../models/Project";
import type Step from "./Step";
import StructureDefinition from "../nodes/StructureDefinition";
import Token from "../nodes/Token";
import FunctionDefinition from "../nodes/FunctionDefinition";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Context from "../nodes/Context";

// Import this last, after everything else, to avoid cycles.
import Native from "../native/NativeBindings";

/** Anything that wants to listen to changes in the state of this evaluator */
export type EvaluationObserver = () => void;

export enum Mode { PLAY, STEP };

export default class Evaluator {

    /** The project that this is evaluating. */
    readonly project: Project;

    /** This represents a stack of node evaluations. The first element of the stack is the currently executing node. */
    readonly evaluations: Evaluation[] = [];

    /** The last evaluation to be removed from the stack */
    #lastEvaluation: Evaluation | undefined;

    /** The callback to notify if the evaluation's value changes. */
    readonly observers: EvaluationObserver[] = [];

    /** True if stop() was called */
    stopped = false;

    /** The value of the evaluted program, cached each time the program is evaluated. */
    latestValues: Map<Source, Value | undefined> = new Map();

    /** The streams changes that triggered this evaluation */
    changedStream: Stream | undefined;

    /** The expressions that need to be re-evaluated, if any. */
    invalidatedExpressions: Set<Expression> | undefined = undefined;

    /** The streams accessed since the latest time requested */
    accessedStreams: Stream[] | undefined = undefined;

    /** A mapping from Reaction nodes in the program to the streams they are listening to. */
    reactionStreams: Map<Reaction, Stream> = new Map();

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

    constructor(project: Project) {

        this.project = project;
        this.evaluations = [];

    }

    /**
     * Evaluates the given program and returns its value.
     * This is primarily used for testing.
     */
    static evaluateCode(main: string, supplements?: string[]): Value | undefined {
        const source = new Source("test", main);
        const project = new Project("test", source, (supplements ?? []).map((code, index) => new Source(`sup${index + 1}`, code)));
        project.evaluate();
        return project.evaluator.getLatestResultOf(source);
    }

    // GETTERS

    getMain(): Source { return this.project.main; }
    getMode(): Mode { return this.mode; }
    getNative(): NativeInterface { return Native; }
    getCurrentStep() { return this.evaluations[0]?.currentStep(); }
    getNextStep() { return this.evaluations[0]?.nextStep(); }
    getCurrentEvaluation() { return this.evaluations.length === 0 ? undefined : this.evaluations[0]; }
    getLastEvaluation() { return this.#lastEvaluation; }
    getCurrentContext() { return this.getCurrentEvaluation()?.getContext() ?? new Context(this.project, this.project.main); }
    /** Get whatever the latest result was of evaluating the program and its streams. */
    getLatestResultOf(source: Source) { return this.latestValues.get(source); }
    getSteps(evaluation: EvaluationNode): Step[] {

        // No expression? No steps.
        let steps = this.steps.get(evaluation);
        if(steps === undefined) {
            // If the evaluation is a structure definition that has no block, synthesize an empty block
            const expression = evaluation.expression;
            if(expression instanceof Token || expression === undefined)
                steps = [];
            else {
                const context = this.project.getNodeContext(expression) ?? new Context(this.project, this.project.main);
                steps = expression.compile(context);
            }
            this.steps.set(evaluation, steps);
        }
        return steps;

    }
    getPriorValueOf(expression: Expression, count?: number) {
        const values = this.values.get(expression);
        const index = count ?? (values === undefined ? undefined : values.length - 1);
        return index === undefined || values === undefined || index >= values.length ? undefined : values[index];
    }

    getCount(expression: Expression) {
        return this.counters.get(expression);
    }

    // PREDICATES

    isPlaying(): boolean { return this.mode === Mode.PLAY; }
    isStepping(): boolean { return this.mode === Mode.STEP; }
    isDone() { return this.evaluations.length === 0; }
    getThis(requestor: Node): Value | undefined { return this.getCurrentEvaluation()?.getThis(requestor); }
    isInvalidated(expression: Expression) { return this.invalidatedExpressions === undefined || this.invalidatedExpressions.has(expression); }
    /** True if any of the evaluations on the stack are evaluating the given source. Used for detecting cycles. */
    isEvaluatingSource(source: Source) { return this.evaluations.some(e => e.getSource() === source); }

    /** Given a node, returns true if the node participates in a step in this program. */
    nodeIsStep(node: Node): boolean {

        // Find evaluable nodes and see if their steps 
        // so we can analyze them for various purposes.
        for(const source of this.project.getSources()) {
            for(const evaluation of source.nodes()) {
                if(evaluation instanceof FunctionDefinition ||
                    evaluation instanceof StructureDefinition ||
                    evaluation instanceof ConversionDefinition ||
                    evaluation instanceof Source) {

                    const steps = this.getSteps(evaluation);
                    const step = steps.find(step => step.node === node);
                    if(step !== undefined) return true;

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

    /** Evaluate until we're done */
    start(changedStream?: Stream, invalidatedExpressions?: Set<Expression>): void {

        // Reset the latest value.
        this.latestValues = new Map();

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
        this.evaluations.push(new Evaluation(this, this.getMain(), this.getMain()));

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

    end(exception?: Exception) {

        // If there's an exception, end all sources with the exception.
        while(this.evaluations.length > 0)
            this.endEvaluation(exception);

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
        else if(value instanceof Value) {
            // End the Evaluation
            this.endEvaluation(value);
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
                this.end();
        }
        // If there was no value, that just means it's not done yet.

    }

    /** Keep evaluating steps in this project, skipping over nodes in other programs. */
    stepWithinProgram(): void {

        let nextStepNode = undefined;
        do {
            // Step ahead
            this.step();
            // Get the current step node
            nextStepNode = this.getCurrentStep()?.node;
        } while(nextStepNode !== undefined && !this.project.contains(nextStepNode));

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
                current = this.project.get(current)?.getParent();
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

    /** Remove the evaluation from the stack, but remember it in case a step needs it (like a Borrow does, to access bindings) */
    endEvaluation(value: Value | undefined) {
        const evaluation = this.evaluations.shift();
        if(evaluation === undefined)
            throw Error("Shouldn't be possible to end an evaluation on an empty evaluation stack.");
        this.#lastEvaluation = evaluation;
        const def = evaluation.getDefinition();
        if(def instanceof Source)
            this.latestValues.set(def, value);
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
        return this.evaluations[0].resolve(name);
    }
    
}