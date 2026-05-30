import type Context from '@nodes/Context';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import Convert from '@nodes/Convert';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import { Emotion } from '../lore/Emotion';
import type Markup from '@nodes/Markup';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from '@concepts/Concept';
import { Purpose } from '@concepts/Purpose';
import type StructureConcept from '@concepts/StructureConcept';
import { CONVERT_SYMBOL } from '@parser/Symbols';

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
        structure?: StructureConcept,
    ) {
        super(Purpose.Types, structure?.definition, context);

        this.definition = definition;
        this.structure = structure;

        this.example = Convert.make(
            ExpressionPlaceholder.make(this.definition.input),
            definition.output,
        );
    }

    getCharacter() {
        return Characters.Conversion;
    }

    getEmotion() {
        return Emotion.cheerful;
    }

    /**
     * A concise, locale-independent identity built from the input/output type
     * source, e.g. "#m → #ft". Conversions have no user-assigned name, so this
     * doubles as both the display label and the URL token: it is what
     * {@link getName} returns and what {@link hasName} matches on, which is how
     * the guide round-trips a conversion through ?concept=Owner/<identifier>.
     */
    getIdentifier(): string {
        return `${this.definition.input.toWordplay().trim()} ${CONVERT_SYMBOL} ${this.definition.output.toWordplay().trim()}`;
    }

    hasName(name: string) {
        return name === this.getIdentifier();
    }

    getDocs(locales: Locales): Markup[] {
        return this.definition.docs.getMarkup(locales);
    }

    getNames() {
        return [this.getIdentifier()];
    }

    getName() {
        return this.getIdentifier();
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

    getCharacterName(): CharacterName | undefined {
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof ConversionConcept &&
            concept.definition === this.definition
        );
    }
}
