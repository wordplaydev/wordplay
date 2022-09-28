import Block from "../nodes/Block";
import type Definition from "../nodes/Definition";
import type Value from "../runtime/Value";
import type Source from "./Source";

/** 
 * An immutable representation of a project with a name and some documents 
 **/
export default class Project {

    readonly name: string;
    readonly main: Source;
    readonly supplements: Source[];

    constructor(name: string, main: Source, supplements: Source[]) {
        
        this.name = name;
        this.main = main;
        this.supplements = supplements.slice();

        // Assign this as the project, indirectly triggering conflict analyses.
        main.setProject(this);
        supplements.forEach(supp => supp.setProject(this));

        // Now start all of the source's evaluators.
        for(const source of this.getSources())
            source.getEvaluator().start([])

    }

    getSources() { return [ this.main, ...this.supplements]; }
    getSourcesExcept(source: Source) { return [ this.main, ...this.supplements].filter(s => s !== source); }
    getName() { return this.name; }

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

    getDefinition(borrower: Source, name: string): Definition {

        const sources = this.getSourcesExcept(borrower);
        for(const source of sources) {
            const lastExpression = source.program.block instanceof Block ? source.program.block.statements[0] : undefined;
            const definition = lastExpression === undefined ? undefined : source.program.block.getDefinition(name, source.evaluator.context, lastExpression);
            if(definition !== undefined) return definition;
        }
        return undefined;
        
    }

    withSource(oldSource: Source, newSource: Source) {
        // Note: we need to clone all of the unchanged sources in order to generate new Programs so that the views can
        // trigger an update. Without this, we'd have the same Source, Program, and Nodes, and the views would have no idea
        // that the conflicts in those same objects have changed.
        if(this.main === oldSource) return new Project(this.name, newSource, this.supplements.map(supplement => supplement.clone()));
        else if(this.supplements.includes(oldSource)) {
            const index = this.supplements.indexOf(oldSource);
            return new Project(this.name, this.main.clone(), [ ...this.supplements.slice(0, index).map(supplement => supplement.clone()), newSource, ...this.supplements.slice(index + 1).map(supplement => supplement.clone())]);
        }
        else return this;
    }

}