import type Context from '../nodes/Context';
import type ConversionDefinition from '../nodes/ConversionDefinition';
import Convert from '../nodes/Convert';
import type Doc from '../nodes/Doc';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import type Node from '../nodes/Node';
import type Spaces from '../parser/Spaces';
import type Translation from '../translations/Translation';
import Concept from './Concept';
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
        super(context);

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

    getDocs(translation: Translation): [Doc, Spaces] | undefined {
        const doc = this.definition.docs?.getTranslation(translation.language);
        return doc ? [doc, this.context.source.getSpaces()] : undefined;
    }

    getDescription(translation: Translation) {
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

    getConcepts(): Set<Concept> {
        return new Set();
    }

    equals(concept: Concept) {
        return (
            concept instanceof ConversionConcept &&
            concept.definition === this.definition
        );
    }
}
