import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import Concept from './Concept';
import type ConceptIndex from './ConceptIndex';
import Purpose from './Purpose';
import type StreamDefinition from '../nodes/StreamDefinition';
import Emotion from '../lore/Emotion';
import BindConcept from './BindConcept';
import StructureConcept from './StructureConcept';
import Evaluate from '../nodes/Evaluate';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import type Markup from '../nodes/Markup';
import type { Character } from '../tutorial/Tutorial';
import type Locales from '../locale/Locales';

export default class StreamConcept extends Concept {
    /** The type this concept represents. */
    readonly definition: StreamDefinition;

    /** A derived reference to the stream */
    readonly reference: Evaluate;

    /** Bind concepts */
    readonly inputs: BindConcept[];

    constructor(stream: StreamDefinition, locales: Locales, context: Context) {
        super(Purpose.Input, undefined, context);

        this.definition = stream;
        this.reference = Evaluate.make(
            Reference.make(locales.getName(stream.names), this.definition),
            this.definition.inputs
                // .filter((input) => !input.hasDefault())
                .map((input) => ExpressionPlaceholder.make(input.type))
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(Purpose.Input, bind, locales, context)
        );
    }

    getGlyphs(locales: Locales) {
        return {
            symbols: locales.getName(this.definition.names),
        };
    }

    getEmotion() {
        return Emotion.bored;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locales: Locales): Markup | undefined {
        const doc = this.definition.docs?.getPreferredLocale(locales);
        return doc?.markup.concretize(locales, []);
    }

    getName(locales: Locales, symbolic: boolean) {
        return locales.getName(this.definition.names, symbolic);
    }

    getTypeConcept(index: ConceptIndex): StructureConcept | undefined {
        const concept = index.getConceptOfType(this.definition.output);
        return concept instanceof StructureConcept ? concept : undefined;
    }

    getRepresentation() {
        return this.reference;
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

    getCharacter(locales: Locales): Character | undefined {
        for (const locale of locales.getLocales()) {
            const name = this.definition.names.getNonSymbolicName();
            if (name === undefined) return undefined;
            for (const [key, text] of Object.entries(locale.input))
                if (
                    'names' in text &&
                    ((typeof text.names === 'string' && text.names === name) ||
                        text.names.includes(name))
                )
                    return key as Character;
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
