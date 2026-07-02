import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import { COMMA_SYMBOL } from '@parser/Symbols';
import type Locales from '@locale/Locales';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { Emotion } from '../lore/Emotion';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Markup from '@nodes/Markup';
import type StreamDefinition from '@nodes/StreamDefinition';
import type { CharacterName } from '../tutorial/Tutorial';
import BindConcept from '@concepts/BindConcept';
import Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';
import { Purpose } from '@concepts/Purpose';
import StructureConcept from '@concepts/StructureConcept';

export default class StreamConcept extends Concept {
    /** The type this concept represents. */
    readonly definition: StreamDefinition;

    /** A derived reference to the stream */
    readonly reference: Evaluate;

    /** A lazily-built reference preferring textual names (see getRepresentation). */
    private referenceTextual: Evaluate | undefined;

    /** Bind concepts */
    readonly inputs: BindConcept[];

    constructor(stream: StreamDefinition, locales: Locales, context: Context) {
        super(Purpose.Inputs, undefined, context);

        this.definition = stream;
        this.reference = Evaluate.make(
            Reference.make(locales.getName(stream.names), this.definition),
            this.definition.inputs
                .filter((input) => !input.hasDefault())
                .map(() => ExpressionPlaceholder.make()),
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(Purpose.Inputs, bind, locales, context),
        );
    }

    getCharacter(locales: Locales) {
        return {
            symbols:
                this.definition.names.getSymbolicName() ??
                this.definition.names
                    .getLocaleNames(locales)
                    .join(COMMA_SYMBOL),
        };
    }

    getEmotion() {
        return Emotion.bored;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locales: Locales): Markup[] {
        return this.definition.docs.getMarkup(locales);
    }

    getNames(_: Locales, symbolic: boolean) {
        if (symbolic) {
            const sym = this.definition.names.getSymbolicName();
            return sym ? [sym] : [];
        } else return this.definition.names.getNames();
    }

    getName(locales: Locales, symbolic: boolean) {
        return locales.getName(this.definition.names, symbolic);
    }

    getTypeConcept(index: ConceptIndex): StructureConcept | undefined {
        const concept = index.getConceptOfType(this.definition.output);
        return concept instanceof StructureConcept ? concept : undefined;
    }

    getRepresentation(locales?: Locales, textual = false) {
        if (!textual || locales === undefined) return this.reference;
        if (this.referenceTextual === undefined)
            this.referenceTextual = Evaluate.make(
                Reference.make(
                    locales.getName(this.definition.names, false),
                    this.definition,
                ),
                this.definition.inputs
                    .filter((input) => !input.hasDefault())
                    .map(() => ExpressionPlaceholder.make()),
            );
        return this.referenceTextual;
    }

    getNodes(): Set<Node> {
        return new Set([this.reference]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getSubConcepts(): Set<Concept> {
        return new Set(this.inputs);
    }

    getCharacterName(locales: Locales): CharacterName | undefined {
        for (const locale of locales.getLocales()) {
            const name = this.definition.names.getNonSymbolicName();
            if (name === undefined) return undefined;
            for (const [key, text] of Object.entries(locale.input))
                if (
                    'names' in text &&
                    ((typeof text.names === 'string' &&
                        withoutAnnotations(text.names) === name) ||
                        (Array.isArray(text.names) &&
                            text.names.some(
                                (n) => withoutAnnotations(n) === name,
                            )))
                )
                    return key as CharacterName;
        }
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof StreamConcept &&
            concept.definition.names
                .getNames()
                .some((name) => this.hasName(name))
        );
    }
}
