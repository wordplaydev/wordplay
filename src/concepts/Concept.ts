import type Context from "../nodes/Context";
import type Node from "../nodes/Node";

/** 
 * Represents some part of the Wordplay language, API, or example ecosystem.
 * Used as a common interface for indexing (to support search) and for drag and drop,
 * which requires some mapping from specific rendered example code in the UI to Nodes.
 */
export default abstract class Concept {

    readonly context: Context;

    constructor(context: Context) {

        this.context = context;
    }

    /**
     * Return a node to represent the concept.
     */
    abstract getRepresentation(): Node;

    /** 
     * Provides a set of Nodes that could be rendered in the UI. 
     * This enables other components to index them, enabling a mapping
     * from representations of the nodes back to the nodes. 
     * */
    abstract getNodes(): Set<Node>;

    /**
     * Provides a set of distinct text strings that the concepts want to expose for searching.
     * This enables creation of an index of concepts for searching and browsing.
     */
    abstract getText(): Set<string>;

    /**
     * Provides a set of sub-concepts that are related to this concept.
     * Enables an index can recurse through a concept graph for related concepts,
     * while also mirroring the tree structure.
     */
    abstract getConcepts(): Set<Concept>;

    /**
     * Given a node ID, finds the node in the concept graph that corresponds.
     */
    getNode(id: number): Node | undefined {
        const match = Array.from(this.getNodes()).find(node => node.id === id);
        if(match) return match;
        for(const concept of this.getConcepts()) {
            const subMatch = concept.getNode(id);
            if(subMatch) return subMatch;
        }
        return undefined;
    }

    /** Recurse and find all concepts in the tree */
    getAllConcepts(): Concept[] {
        let concepts: Concept[] = [ this ];
        for(const concept of this.getConcepts())
           concepts = concepts.concat(concept.getAllConcepts());
        return concepts;
    }

    abstract equals(concept: Concept): boolean;

}