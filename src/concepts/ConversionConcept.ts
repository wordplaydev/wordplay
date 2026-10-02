import type Context from '#nodes/Context.ts';
import type ConversionDefinition from '#nodes/ConversionDefinition.ts';
import Convert from '#nodes/Convert.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import type Node from '#nodes/Node.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import { Emotion } from '../lore/Emotion';
import type Markup from '#nodes/Markup.ts';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from '#concepts/Concept.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type StructureConcept from '#concepts/StructureConcept.ts';
import { CONVERT_SYMBOL } from '#parser/Symbols.ts';

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
        return this.getLocalizedMarkup(
            this.definition,
            this.definition.docs,
            locales,
        );
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
