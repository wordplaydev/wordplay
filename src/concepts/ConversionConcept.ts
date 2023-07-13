import type Context from '@nodes/Context';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import Convert from '@nodes/Convert';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import type Locale from '@locale/Locale';
import Emotion from '../lore/Emotion';
import Glyphs from '../lore/Glyphs';
import Concept from './Concept';
import Purpose from './Purpose';
import type StructureConcept from './StructureConcept';
import concretize from '../locale/concretize';
import type Markup from '../nodes/Markup';

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
        super(Purpose.Convert, structure?.definition, context);

        this.definition = definition;
        this.structure = structure;

        this.example = Convert.make(
            ExpressionPlaceholder.make(this.definition.input),
            definition.output
        );
    }

    getGlyphs() {
        return Glyphs.Conversion;
    }

    getEmotion() {
        return Emotion.cheerful;
    }

    hasName() {
        return false;
    }

    getDocs(locale: Locale): Markup | undefined {
        const doc = this.definition.docs?.getLocale(locale.language);
        return doc?.markup?.concretize(locale, []);
    }

    getName(locale: Locale) {
        return this.definition
            .getDescription(concretize, locale, this.context)
            .toText();
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
