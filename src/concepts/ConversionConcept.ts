import type Context from '@nodes/Context';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import Convert from '@nodes/Convert';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import Emotion from '../lore/Emotion';
import Glyphs from '../lore/Glyphs';
import Concept from './Concept';
import Purpose from './Purpose';
import type StructureConcept from './StructureConcept';
import concretize from '../locale/concretize';
import type Markup from '../nodes/Markup';
import type { Character } from '../tutorial/Tutorial';
import type Locales from '../locale/Locales';

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

    getDocs(locales: Locales): Markup | undefined {
        const doc = this.definition.docs?.getPreferredLocale(locales);
        return doc?.markup?.concretize(locales, []);
    }

    getName(locales: Locales) {
        return this.definition
            .getDescription(concretize, locales, this.context)
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

    getCharacter(): Character | undefined {
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof ConversionConcept &&
            concept.definition === this.definition
        );
    }
}
