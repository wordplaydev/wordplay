import Keyboard from "../native/Keyboard";
import Microphone from "../native/Microphone";
import MouseButton from "../native/MouseButton";
import MousePosition from "../native/MousePosition";
import Time from "../native/Time";
import Bind from "../nodes/Bind";
import type Definition from "../nodes/Definition";
import type Program from "../nodes/Program";
import type Value from "../runtime/Value";
import type Source from "./Source";

/** 
 * An immutable representation of a project with a name and some documents 
 **/
export default class Project {

    readonly name: string;
    readonly main: Source;
    readonly supplements: Source[];
    
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

        // Assign this as the project
        main.setProject(this);
        supplements.forEach(supp => supp.setProject(this));

        // Create all the streams.
        this.streams = this.createStreams();

        // Add them to the shares of all the sources, for analysis and execution.
        for(const source of this.getSources())
            source.evaluator.shares.addStreams(Object.values(this.streams));

        // Analyze each source, now that all project source is set.
        main.analyze();
        supplements.forEach(supp => supp.analyze());
        

    }

    createStreams() {
        return {
            time: new Time(this.main.program),
            mouseButton: new MouseButton(this.main.program),
            mousePosition: new MousePosition(this.main.evaluator),
            keyboard: new Keyboard(this.main.evaluator),
            microphone: new Microphone(this.main.program)
        };
    }

    getSources() { 
        return [ this.main, ...this.supplements]; 
    }

    getSourcesExcept(source: Source) { return [ this.main, ...this.supplements].filter(s => s !== source); }
    getName() { return this.name; }
    getContext() { return this.main.getContext(); }
    getSourceWithProgram(program: Program) { return this.getSources().find(source => source.program === program); }

    isEvaluating() {
        return this.getSources().some(source => source.evaluator.isEvaluating());
    }

    evaluate() {

        // Get the evaluation order based on borrows, reverse it, and execute in that order.
        const orderedSources = this.getEvaluationOrder(this.main).reverse();

        // Reset all of the streams.
        for(const stream of Object.values(this.streams))
            stream.clear();

        // Start the sources that main depends on. Create all of the streams.
        for(const source of orderedSources)
            source.getEvaluator().start([]);

        // Start any sources that main doesn't depend on.
        for(const source of this.getSources())
            if(!orderedSources.includes(source))
                source.getEvaluator().start([]);

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
        this.main.cleanup();
        this.supplements.forEach(supp => supp.cleanup());
    }

    /** See if any of source other than the borrow expose the given name. */
    resolveShare(borrower: Source, name: string): Value | undefined {

        const sources = this.getSources().filter(s => s !== borrower);
        for(const source of sources) {
            const match = source.getEvaluator().resolveShare(name);
            if(match !== undefined) return match;
        }
        return undefined;

    }

    /** Searches source other than the given borrow for top-level binds matching the given name. */
    getDefinition(borrower: Source, name: string): [ Definition, Source ] | undefined {

        const sources = this.getSourcesExcept(borrower);
        // Do any of the sources have a name that matches, or a shared bind that matches?
        for(const source of sources) {
            if(source.name === name) return [ source, source ];
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