import type Conflict from "../conflicts/Conflict";
import Keyboard from "../native/Keyboard";
import Microphone from "../native/Microphone";
import MouseButton from "../native/MouseButton";
import MousePosition from "../native/MousePosition";
import Time from "../native/Time";
import Bind from "../nodes/Bind";
import type Context from "../nodes/Context";
import type Definition from "../nodes/Definition";
import Evaluate from "../nodes/Evaluate";
import Expression from "../nodes/Expression";
import FunctionDefinition from "../nodes/FunctionDefinition";
import type Program from "../nodes/Program";
import type StructureDefinition from "../nodes/StructureDefinition";
import Evaluator from "../runtime/Evaluator";
import type Stream from "../runtime/Stream";
import type Value from "../runtime/Value";
import type Source from "./Source";
import type Node from "../nodes/Node";
import HOF from "../native/HOF";
import FunctionDefinitionType from "../nodes/FunctionDefinitionType";

/** 
 * A project with a name, some source files, and evaluators for each source file.
 **/
export default class Project {

    /** The name of the project */
    readonly name: string;

    /** The main source file that starts evaluation */
    readonly main: Source;

    /** All source files in the project, and their evaluators */
    readonly supplements: Source[];

    /** Evaluators for the source files */
    readonly mainEvaluator: Evaluator;
    readonly evaluators: Map<Source, Evaluator> = new Map();
    
    /** Conflicts by node. */
    readonly primaryConflicts: Map<Node, Conflict[]> = new Map();
    readonly secondaryConflicts: Map<Node, Conflict[]> = new Map();

    /** Evaluations by function and structures they evaluate (a call graph) */
    readonly evaluations: Map<FunctionDefinition | StructureDefinition, Set<Evaluate>> = new Map();

    /** Expression dependencies */
    /** An index of expression dependencies, mapping an Expression to one or more Expressions that are affected if it changes value.  */
    readonly dependencies: Map<Expression | Value, Set<Expression>> = new Map();

    readonly streams: {
        time: Time,
        mouseButton: MouseButton,
        mousePosition: MousePosition,
        keyboard: Keyboard,
        microphone: Microphone
    };

    constructor(name: string, main: Source, supplements: Source[]) {
        
        // Remember the source.
        this.name = name;
        this.main = main;
        this.supplements = supplements.slice();

        // Create evaluators for each source.
        this.mainEvaluator = new Evaluator(this, this.main);
        this.evaluators.set(this.main, this.mainEvaluator);
        for(const source of this.supplements)
            this.evaluators.set(source, new Evaluator(this, source));

        // Create all the streams.
        this.streams = {
            time: new Time(this.main.program),
            mouseButton: new MouseButton(this.main.program),
            mousePosition: new MousePosition(this.mainEvaluator),
            keyboard: new Keyboard(this.mainEvaluator),
            microphone: new Microphone(this.main.program)
        };

        // Listen to all streams
        for(const stream of Object.values(this.streams))
            stream.listen(this.react.bind(this));

        // Share each stream with each evaluator.
        for(const evaluator of this.evaluators.values())
            evaluator.shares.addStreams(Object.values(this.streams));
        
        // Analyze the project
        this.analyze();

    }

    getSources() { 
        return [ this.main, ...this.supplements]; 
    }

    getEvaluator(source: Source): Evaluator | undefined { return this.evaluators.get(source); }
    getSourceContext(source: Source): Context | undefined { return this.evaluators.get(source)?.context; }

    getSourcesExcept(source: Source) { return [ this.main, ...this.supplements].filter(s => s !== source); }
    getName() { return this.name; }
    getContext() { return this.mainEvaluator.context; }
    getSourceWithProgram(program: Program) { return this.getSources().find(source => source.program === program); }

    isEvaluating() {
        return Array.from(this.evaluators.values()).some(evaluator => evaluator.isEvaluating());
    }
    
    analyze() {

        // Build a mapping from nodes to conflicts.
        for(const source of this.getSources()) {

            const context = this.getSourceContext(source);
            if(context === undefined) continue;

            // Compute all of the conflicts in the program.
            const conflicts = source.program.getAllConflicts(context);

            // Build conflict indices by going through each conflict, asking for the conflicting nodes
            // and adding to the conflict to each node's list of conflicts.
            conflicts.forEach(conflict => {
                const complicitNodes = conflict.getConflictingNodes();
                complicitNodes.primary.forEach(node => {
                    let nodeConflicts = this.primaryConflicts.get(node) ?? [];
                    this.primaryConflicts.set(node, [ ... nodeConflicts, conflict ]);
                });
                complicitNodes.secondary?.forEach(node => {
                    let nodeConflicts = this.secondaryConflicts.get(node) ?? [];
                    this.secondaryConflicts.set(node, [ ... nodeConflicts, conflict ]);
                });
            });

            // Build a mapping from functions and structures to their evaluations.
            for(const node of source.nodes()) {

                // Find all Evaluates
                if(node instanceof Evaluate) {
                    // Find the function called.
                    const fun = node.getFunction(context);
                    if(fun) {
                        // Add this evaluate to the function's list of calls.
                        const evaluates = this.evaluations.get(fun) ?? new Set();
                        evaluates.add(node);
                        this.evaluations.set(fun, evaluates);
    
                        // Is it a higher order function? Get the function input
                        // and add the Evaluate as a caller of the function input.
                        if(fun instanceof FunctionDefinition && fun.expression instanceof HOF) {
                            for(const input of node.inputs) {
                                const type = input.getTypeUnlessCycle(context);
                                if(type instanceof FunctionDefinitionType) {
                                    const hofEvaluates = this.evaluations.get(type.fun) ?? new Set();
                                    hofEvaluates.add(node);
                                    this.evaluations.set(type.fun, hofEvaluates);
                                }
                            }
                        }
                    }
                }

                // Build the dependency graph by asking each expression node for its dependencies.
                if(node instanceof Expression) {
                    for(const dependency of node.getDependencies(context)) {
                        const set = this.dependencies.get(dependency);
                        if(set)
                            set.add(node);
                        else
                            this.dependencies.set(dependency, new Set([ node ]));
                    }
                }
                
            }
 
        }

    }

    getPrimaryConflicts() { return this.primaryConflicts; }
    getSecondaryConflicts() { return this.secondaryConflicts; }

    /** Given a node N, and the set of conflicts C in the program, determines the subset of C in which the given N is complicit. */
    getPrimaryConflictsInvolvingNode(node: Node) {
        return this.primaryConflicts.get(node);
    }

    getSecondaryConflictsInvolvingNode(node: Node) {
        return this.secondaryConflicts.get(node);
    }

    getEvaluationsOf(fun: FunctionDefinition | StructureDefinition): Evaluate[] {
        return Array.from(this.evaluations.get(fun) ?? []);
    }

    getExpressionsAffectedBy(expression: Value | Expression): Set<Expression> {
        return this.dependencies.get(expression) ?? new Set();
    }

    react(stream: Stream) {

        // A stream changed!
        // STEP 1: Find the zero or more nodes that depend on this stream.
        let affectedExpressions: Set<Expression> = new Set();
        let streamReferences = new Set<Expression>();
        const affected = this.getExpressionsAffectedBy(stream);
        if(affected.size > 0) {
            for(const dependency of affected) {
                affectedExpressions.add(dependency);
                streamReferences.add(dependency);
            }
        }

        // STEP 2: Traverse the dependency graphs of each source, finding all that directly or indirectly are affected by this stream's change.
        const affectedSources: Set<Source> = new Set();
        let unvisited = new Set(affectedExpressions);
        while(unvisited.size > 0) {
            for(const expr of unvisited) {
                // Remove from the visited list.
                unvisited.delete(expr);

                // Mark that the source was affected.
                const affectedSource = this.getSources().find(source => source.contains(expr));
                if(affectedSource)
                    affectedSources.add(affectedSource);

                const affected = this.getExpressionsAffectedBy(expr);
                // Visit all of the affected nodes.
                for(const newExpr of affected) {
                    // Avoid cycles
                    if(!affectedExpressions.has(newExpr)) {
                        affectedExpressions.add(newExpr);
                        unvisited.add(newExpr);
                    }
                }            
            }
        }

        // STEP 3: After traversal, remove the stream references from the affected expressions; they will evaluate to the same thing, so they don't need to
        // be reevaluated.
        for(const streamRef of streamReferences)
            affectedExpressions.delete(streamRef);

        // STEP 4: Reevaluate all Programs affected by the change, sending the affected expressions and source files so that each Evaluator
        //         can re-evaluate only the affected expressions.
        this.evaluate(stream, affectedSources, affectedExpressions);

    }

    /** Evaluate the sources in the required order, optionally evaluating only a subset of sources. */
    evaluate(changedStream?: Stream, changedSources?: Set<Source>, changedExpressions?: Set<Expression>) {
    
        // Get the evaluation order based on borrows, reverse it, and execute in that order.
        const orderedSources = this.getEvaluationOrder(this.main).reverse();

        // Start the sources that main depends on. Create all of the streams.
        for(const source of orderedSources)
            if(changedSources === undefined || changedSources.has(source))
                this.evaluators.get(source)?.start(changedStream, changedExpressions);

        // Start any sources that main doesn't depend on.
        for(const source of this.getSources())
            if(!orderedSources.includes(source) && (changedSources === undefined || changedSources.has(source)))
                this.evaluators.get(source)?.start(changedStream, changedExpressions);

    }

    /** Returns a path from a borrow in this program this to this, if one exists. */
    getEvaluationOrder(source: Source, path: Source[] = []): Source[] {

        // Visit this source.
        path.push(source);

        // Visit each borrow in the source's program to see if there's a path back here.
        for(const borrow of source.program.borrows) {

            // Find the definition.
            const name = borrow.name?.getText();
            if(name) {
                // Does another program in the project define it?
                const [ , nextSource ] = this.getDefinition(source, name) ?? [];
                if(nextSource) {
                    // If we found a cycle, return the path.
                    if(path.includes(nextSource))
                        return path;
                    // Otherwise, continue searching for a cycle.
                    this.getEvaluationOrder(nextSource, path);
                }
            }
        }

        // We made it without detecting a cycle; return undefined.
        return path;

    }

    cleanup() { 
        // Stop all streams.
        for(const stream of Object.values(this.streams))
            stream.stop();

        // Stop all evaluators
        for(const evaluator of this.evaluators.values())
            evaluator.stop();
    }

    /** See if any of source other evaluators expose the given name. */
    resolveShare(borrower: Source, name: string): Value | undefined {

        const sources = this.getSources().filter(s => s !== borrower);
        for(const source of sources) {
            const match = this.evaluators.get(source)?.resolveShare(name);
            if(match !== undefined) return match;
        }
        return undefined;

    }

    /** Searches source other than the given borrow for top-level binds matching the given name. */
    getDefinition(borrower: Source, name: string): [ Definition, Source ] | undefined {

        const sources = this.getSourcesExcept(borrower);
        // Do any of the sources have a name that matches, or a shared bind that matches?
        for(const source of sources) {
            if(source.hasName(name)) return [ source, source ];
            const definition = source.program.block.statements.find(n => n instanceof Bind && n.hasName(name) && n.isShared()) as Bind | undefined;
            if(definition !== undefined) return [ definition, source ];
        }
        return undefined;
        
    }

    withSource(oldSource: Source, newSource: Source) {
        return this.withSources([[ oldSource, newSource ]]);
    }

    withSources(replacements: [ Source, Source ][]) {
        // Note: we need to clone all of the unchanged sources in order to generate new Programs so that the views can
        // trigger an update. Without this, we'd have the same Source, Program, and Nodes, and the views would have no idea
        // that the conflicts in those same objects have changed.
        const mainReplacement = replacements.find(replacement => replacement[0] === this.main);
        const newMain = mainReplacement ? mainReplacement[1] : this.main.replace();
        const newSupplements = this.supplements.map(supplement => {
            const supplementReplacement = replacements.find(replacement => replacement[0] === supplement);
            return supplementReplacement ? supplementReplacement[1] : supplement.replace();
        });
        return new Project(this.name, newMain, newSupplements);
    }

}