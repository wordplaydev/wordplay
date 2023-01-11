import type Concept from './Concept';
import type Node from '../nodes/Node';
import type Type from '../nodes/Type';
import StructureConcept from './StructureConcept';
import type Translation from '../translation/Translation';

export default class ConceptIndex {
    readonly concepts: Concept[];
    readonly translations: Translation[];

    constructor(concepts: Concept[], translations: Translation[]) {
        this.concepts = concepts;
        this.translations = translations;
    }

    /** Search through the concepts to find a corresponding node */
    getNode(id: number): Node | undefined {
        // Search all entries for a matching node.
        for (const concept of this.concepts) {
            const match = concept.getNode(id);
            if (match) return match;
        }
        return undefined;
    }

    getEquivalent(concept: Concept): Concept | undefined {
        return this.concepts.find((c) => c.equals(concept));
    }

    getConceptOfType(type: Type): Concept | undefined {
        return this.concepts.find(
            (c) => c instanceof StructureConcept && c.representsType(type)
        );
    }

    getConceptByName(name: string): Concept | undefined {
        return this.concepts.find((c) => c.hasName(name, this.translations[0]));
    }
}
