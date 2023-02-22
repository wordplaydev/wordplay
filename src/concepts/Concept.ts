import type Doc from '@nodes/Doc';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type { Description } from '@translation/Translation';
import type Translation from '@translation/Translation';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Glyph from '../lore/Glyph';
import type LanguageCode from '../translation/LanguageCode';

/**
 * Represents some part of the Wordplay language, API, or example ecosystem.
 * Used as a common interface for indexing (to support search) and for drag and drop,
 * which requires some mapping from specific rendered example code in the UI to Nodes.
 */
export default abstract class Concept {
    readonly purpose: Purpose;
    readonly affiliation: StructureDefinition | undefined;
    readonly context: Context;

    constructor(
        purpose: Purpose,
        affiliation: StructureDefinition | undefined,
        context: Context
    ) {
        this.context = context;

        this.purpose = purpose;
        this.affiliation = affiliation;
    }

    getPurpose() {
        return this.purpose;
    }

    getAffiliation() {
        return this.affiliation;
    }

    /**
     * Returns the glyph that represents the concept.
     */
    abstract getGlyphs(languages: LanguageCode[]): Glyph;

    /**
     * Returns true if the concept has the given name or id.
     */
    abstract hasName(name: string, translation: Translation): boolean;

    /**
     * Return a node to represent the concept. Usually an example or template.
     */
    abstract getRepresentation(): Node;

    /**
     * Returns a localized creator-facing name or description to represent the concept.
     */
    abstract getName(translation: Translation): Description;

    /**
     * Returns, if available, documentation for the concept.
     */
    abstract getDocs(translation: Translation): Doc | undefined;

    /**
     * Provides a set of Nodes that could be rendered in the UI.
     * This enables other components to index them, enabling a mapping
     * from representations of the nodes back to the nodes.
     */
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
    abstract getSubConcepts(): Set<Concept>;

    /**
     * Should return true if anything about the concept matches the query text.
     */
    getTextMatching(
        translation: Translation,
        query: string
    ): [string, number] | undefined {
        const description = this.getName(translation);
        if (typeof description === 'string') {
            const lowerDescription = description.toLocaleLowerCase(
                translation.language
            );
            const index = lowerDescription.indexOf(query);
            if (index >= 0) return [description, index];
        } else {
            const match = description.getTextContaining(
                translation.language,
                query
            );
            if (match !== undefined) return match;
        }
        return this.getDocs(translation)?.getMatchingText(query);
    }

    /**
     * Given a node ID, finds the node in the concept graph that corresponds.
     */
    getNode(id: number): Node | undefined {
        const match = Array.from(this.getNodes()).find(
            (node) => node.id === id
        );
        if (match) return match;
        for (const concept of this.getSubConcepts()) {
            const subMatch = concept.getNode(id);
            if (subMatch) return subMatch;
        }
        return undefined;
    }

    /** Recurse and find all concepts in the tree */
    getAllSubConcepts(): Concept[] {
        let concepts: Concept[] = [];
        for (const concept of this.getSubConcepts())
            concepts = concepts.concat(concept.getAllSubConcepts());
        return concepts;
    }

    abstract equals(concept: Concept): boolean;
}
