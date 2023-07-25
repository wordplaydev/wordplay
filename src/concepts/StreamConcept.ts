import type Context from '@nodes/Context';
import type LanguageCode from '@locale/LanguageCode';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import Concept from './Concept';
import type ConceptIndex from './ConceptIndex';
import type Locale from '@locale/Locale';
import Purpose from './Purpose';
import type StreamDefinition from '../nodes/StreamDefinition';
import Emotion from '../lore/Emotion';
import BindConcept from './BindConcept';
import StructureConcept from './StructureConcept';
import Evaluate from '../nodes/Evaluate';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import type Markup from '../nodes/Markup';

export default class StreamConcept extends Concept {
    /** The type this concept represents. */
    readonly definition: StreamDefinition;

    /** A derived reference to the stream */
    readonly reference: Evaluate;

    /** Bind concepts */
    readonly inputs: BindConcept[];

    constructor(
        stream: StreamDefinition,
        languages: LanguageCode[],
        context: Context
    ) {
        super(Purpose.Input, undefined, context);

        this.definition = stream;
        this.reference = Evaluate.make(
            Reference.make(
                stream.names.getLocaleText(languages),
                this.definition
            ),
            this.definition.inputs
                // .filter((input) => !input.hasDefault())
                .map((input) => ExpressionPlaceholder.make(input.type))
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(Purpose.Input, bind, languages, context)
        );
    }

    getGlyphs(languages: LanguageCode[]) {
        return {
            symbols: this.definition.names.getLocaleText(languages, true),
        };
    }

    getEmotion() {
        return Emotion.bored;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locale: Locale): Markup | undefined {
        const doc = this.definition.docs?.getLocale(locale.language);
        return doc?.markup.concretize(locale, []);
    }

    getName(locale: Locale, symbolic: boolean) {
        return this.definition.names.getLocaleText(locale.language, symbolic);
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

    isEqualTo(concept: Concept) {
        return (
            concept instanceof StreamConcept &&
            concept.definition.names
                .getNames()
                .some((name) => this.hasName(name))
        );
    }
}
