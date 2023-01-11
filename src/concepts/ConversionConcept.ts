import type Context from '../nodes/Context';
import type ConversionDefinition from '../nodes/ConversionDefinition';
import Convert from '../nodes/Convert';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import type Node from '../nodes/Node';
import type Translation from '../translation/Translation';
import Concept from './Concept';
import Purpose from './Purpose';
import type StructureConcept from './StructureConcept';

export default class ConversionConcept extends Concept {
    /** The function this concept represents. */
    readonly definition: ConversionDefinition;

    /** The structure concept on which this conversion is defined, if any */
    readonly structure: StructureConcept | undefined;

    /** A derived example */
    readonly example: Node;

    constructor(
        definition: ConversionDefinition,
        context: Context,
        structure?: StructureConcept
    ) {
        super(Purpose.CONVERT, structure?.definition, context);

        this.definition = definition;
        this.structure = structure;

        this.example = Convert.make(
            ExpressionPlaceholder.make(this.definition.input),
            definition.output
        );
    }

    hasName() {
        return false;
    }

    getDocs(translation: Translation) {
        return this.definition.docs?.getTranslation(translation.language);
    }

    getName(translation: Translation) {
        return this.definition.getDescription(translation, this.context);
    }

    getRepresentation() {
        return this.example;
    }

    getNodes(): Set<Node> {
        return new Set([this.example]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getSubConcepts(): Set<Concept> {
        return new Set();
    }

    equals(concept: Concept) {
        return (
            concept instanceof ConversionConcept &&
            concept.definition === this.definition
        );
    }
}
