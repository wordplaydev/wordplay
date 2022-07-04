import type Document from './Document';

/** An immutable representation of a project with a name and some documents */
export default class Project {
    readonly name: string;
    readonly docs: Document[];

    constructor(name: string, docs: Document[]) {
        this.name = name;
        this.docs = [ ... docs ];
    }

    withRevisedDocument(doc: Document, newDoc: Document): Project | undefined {
        const index = this.docs.indexOf(doc);
        if(index < 0) return;
        // Make a new project replacing the doc itself and also any documents that depend on it.
        const newProject = new Project(this.name, 
            this.docs.map(d =>
                d === doc ? newDoc :
                d.content === doc ? d.withContent(newDoc) :
                d
            )
        );
        return newProject;
    }
}