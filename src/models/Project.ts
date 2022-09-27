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

    }

    getName() { return this.name; }

    cleanup() { 
        this.main.cleanup();
        this.supplements.forEach(supp => supp.cleanup());
    }

    withSource(oldSource: Source, newSource: Source) {
        if(this.main === oldSource) return new Project(this.name, newSource, this.supplements);
        else if(this.supplements.includes(oldSource)) {
            const index = this.supplements.indexOf(oldSource);
            return new Project(this.name, this.main, [ ...this.supplements.slice(0, index), newSource, ...this.supplements.slice(index + 1)]);
        }
        else return this;
    }

}