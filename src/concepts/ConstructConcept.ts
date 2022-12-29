import Concept from "./Concept";
import type Node from "../nodes/Node";

export default class ConstructConcept extends Concept {

    readonly template: Node;
    
    constructor(template: Node) {

        super();

        this.template = template;

    }

    getRepresentation() { return this.template; }

    getNodes(): Set<Node> {
        return new Set([ this.template ]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getConcepts(): Set<Concept> {
        return new Set();
    }

}