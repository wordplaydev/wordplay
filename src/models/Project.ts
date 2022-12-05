import type Conflict from "../conflicts/Conflict";
import Keyboard from "../native/Keyboard";
import Microphone from "../native/Microphone";
import MouseButton from "../native/MouseButton";
import MousePosition from "../native/MousePosition";
import Time from "../native/Time";
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
import Native from "../native/NativeBindings";
import Tree from "../nodes/Tree";
import DefaultShares from "../runtime/DefaultShares";
import Context from "../nodes/Context";
import type { SharedDefinition } from "../nodes/Borrow";


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

    /** The evaluator that evaluates the source. */
    readonly evaluator: Evaluator;
    
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

    readonly trees: Tree[];
    readonly _index: Map<Node,Tree | undefined> = new Map();

    constructor(name: string, main: Source, supplements: Source[]) {
        
        // Remember the source.
        this.name = name;
        this.main = main;
        this.supplements = supplements.slice();

        // Create evaluators for each source.
        this.evaluator = new Evaluator(this);

        // Create all the streams.
        this.streams = {
            time: new Time(this.evaluator),
            mouseButton: new MouseButton(this.evaluator),
            mousePosition: new MousePosition(this.evaluator),
            keyboard: new Keyboard(this.evaluator),
            microphone: new Microphone(this.evaluator)
        };

        // Listen to all streams
        for(const stream of Object.values(this.streams))
            stream.listen(this.react.bind(this));
        
        // Build all of the trees we might need for analysis.
        this.trees = [
            ...(this.getSources().map(source => new Tree(source))),
            ...Native.getStructureDefinitionTrees(),
            ...DefaultShares.map(share => new Tree(share))
        ]
        
        // Analyze the project
        this.analyze();

    }

    get(node: Node): Tree | undefined {

        if(!this._index.has(node))
            this._index.set(node, this.resolve(node));
        return this._index.get(node);
        
    }

    /** Get a tree that that represents the node. It could be in a source, one of the native types, or a share. */
    resolve(node: Node): Tree | undefined {

        // Search the trees in the context for a matching node.
        for(const tree of this.trees) {
            const match = tree.get(node);
            if(match) return match;
        }

        return undefined;

    }

    /** True if one of the project's contains the given node. */
    contains(node: Node) {
        return this.getSourceOf(node) !== undefined;
    }
    
    getSources() { 
        return [ this.main, ...this.supplements]; 
    }

    getDefaultShares() { return DefaultShares; }

    getContext(source: Source) { 
        return new Context(this, source);
    }

    getNodeContext(node: Node) {
        const source = this.getSourceOf(node);
        return source === undefined ? undefined : this.getContext(source);
    }

    getSourceOf(node: Node) {
        return this.getSources().find(source => source.contains(node));
    }
    
    getSourcesExcept(source: Source) { return [ this.main, ...this.supplements].filter(s => s !== source); }
    getName() { return this.name; }
    getSourceWithProgram(program: Program) { return this.getSources().find(source => source.expression === program); }
    getNative() { return Native; }

    analyze() {

        // Build a mapping from nodes to conflicts.
        for(const source of this.getSources()) {

            const context = this.getContext(source);

            // Compute all of the conflicts in the program.
            const conflicts = source.expression.getAllConflicts(context);

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
        this.evaluate(stream, affectedSources, undefined);

    }

    /** Evaluate the sources in the required order, optionally evaluating only a subset of sources. */
    evaluate(changedStream?: Stream, _?: Set<Source>, changedExpressions?: Set<Expression>) {
    
        this.evaluator.start(changedStream, changedExpressions);

    }

    cleanup() { 
        // Stop all streams.
        for(const stream of Object.values(this.streams))
            stream.stop();

        // Stop evaluators
        this.evaluator.stop();
    }

    /** Searches source other than the given borrow for top-level binds matching the given name. */
    getShare(source: string, name: string | undefined): [ Source | undefined, SharedDefinition ] | undefined {

        // Do any of the sources match the requested source, or have a share that matches, or a shared bind that matches?
        const match = this.getSources().find(s => s.hasName(source));
        if(match) {
            if(name === undefined)
                return [ match, match ];
            const def = match.getShare(name);
            return def === undefined ? undefined : [ match, def ];
        }

        // Do any of the implicit shares match?
        const defaultMatch = 
            DefaultShares.find(s => s.hasName(source)) ?? 
            Object.values(this.streams).find(s => s.hasName(source));

        return defaultMatch === undefined ? undefined : [ undefined, defaultMatch ];

    }

    clone() { 
        return new Project(this.name, this.main, this.supplements);
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