import Keyboard from "../native/Keyboard";
import Microphone from "../native/Microphone";
import MouseButton from "../native/MouseButton";
import MousePosition from "../native/MousePosition";
import Time from "../native/Time";
import Bind from "../nodes/Bind";
import type Definition from "../nodes/Definition";
import type Evaluate from "../nodes/Evaluate";
import type Expression from "../nodes/Expression";
import type FunctionDefinition from "../nodes/FunctionDefinition";
import type Program from "../nodes/Program";
import type StructureDefinition from "../nodes/StructureDefinition";
import Evaluator from "../runtime/Evaluator";
import type Stream from "../runtime/Stream";
import type Value from "../runtime/Value";
import type Source from "./Source";

/** 
 * A project with a name, some source files, and evaluators for each source file.
 **/
export default class Project {

    /** The name of the project */
    readonly name: string;

    /** The source files in the project */
    readonly main: Source;
    readonly supplements: Source[];

    /** Evaluators for the source files */
    readonly mainEvaluator: Evaluator;
    readonly evaluators: Map<Source, Evaluator> = new Map();
    
    streams: {
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
        this.mainEvaluator = new Evaluator(this.main);
        this.evaluators.set(this.main, this.mainEvaluator);
        for(const source of this.supplements)
            this.evaluators.set(source, new Evaluator(source));

        // Assign this as the project
        main.setProject(this);
        supplements.forEach(supp => supp.setProject(this));

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

        // Analyze each source, now that all project source is set.
        main.analyze(this.mainEvaluator.context);
        supplements.forEach(supp => supp.analyze(this.mainEvaluator.context));
        
    }

    getSources() { 
        return [ this.main, ...this.supplements]; 
    }

    getEvaluator(source: Source): Evaluator | undefined { return this.evaluators.get(source); }

    getSourcesExcept(source: Source) { return [ this.main, ...this.supplements].filter(s => s !== source); }
    getName() { return this.name; }
    getContext() { return this.main.getContext(); }
    getSourceWithProgram(program: Program) { return this.getSources().find(source => source.program === program); }

    isEvaluating() {
        return Array.from(this.evaluators.values()).some(evaluator => evaluator.isEvaluating());
    }

    react(stream: Stream) {

        // A stream changed!
        // STEP 1: Find the zero or more nodes that depend on this stream.
        let affectedExpressions: Set<Expression> = new Set();
        let streamReferences = new Set<Expression>();
        for(const source of this.getSources()) {
            const affected = source.getExpressionsAffectedBy(stream);
            if(affected.size > 0) {
                for(const dependency of affected) {
                    affectedExpressions.add(dependency);
                    streamReferences.add(dependency);
                }
            }
        }

        // STEP 2: Traverse the dependency graphs of each source, finding all that directly or indirectly are affected by this stream's change.
        const affectedSources: Set<Source> = new Set();
        let unvisited = new Set(affectedExpressions);
        while(unvisited.size > 0) {
            for(const expr of unvisited) {
                unvisited.delete(expr);
                // Find the source the expression is in.
                for(const source of this.getSources()) {
                    const affected = source.getExpressionsAffectedBy(expr);
                    if(affected.size > 0)
                        affectedSources.add(source);
                    for(const newExpr of affected) {
                        // Avoid cycles
                        if(!affectedExpressions.has(newExpr)) {
                            affectedExpressions.add(newExpr);
                            unvisited.add(newExpr);
                        }
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

    getEvaluationsOf(fun: FunctionDefinition | StructureDefinition): Evaluate[] {

        let evaluates: Set<Evaluate> = new Set();
        for(const source of this.getSources())
            evaluates = new Set([ ... evaluates, ... source.getEvaluationsOf(fun) ]);
        return Array.from(evaluates);

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