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
import type Doc from '../nodes/Doc';
import type Spaces from '../parser/Spaces';
import BindConcept from './BindConcept';
import type StructureConcept from './StructureConcept';

export default class StreamConcept extends Concept {
    /** The type this concept represents. */
    readonly definition: StreamDefinition;

    /** A derived reference to the stream */
    readonly reference: Reference;

    /** Bind concepts */
    readonly inputs: BindConcept[];

    constructor(
        stream: StreamDefinition,
        languages: LanguageCode[],
        context: Context
    ) {
        super(Purpose.Input, undefined, context);

        this.definition = stream;
        this.reference = Reference.make(
            stream.names.getLocaleText(languages),
            this.definition
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(Purpose.Input, bind, languages, context)
        );
    }

    getGlyphs(languages: LanguageCode[]) {
        return {
            symbols: this.definition.names.getLocaleText(languages),
        };
    }

    getEmotion() {
        return Emotion.Bored;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(translation: Locale): [Doc, Spaces] | undefined {
        const doc = this.definition.docs?.getLocale(translation.language);
        return doc ? [doc, this.context.source.spaces] : undefined;
    }

    getName(translation: Locale, symbolic: boolean) {
        return this.definition.names.getLocaleText(
            translation.language,
            symbolic
        );
    }

    getTypeConcept(index: ConceptIndex): StructureConcept | undefined {
        return index.getConceptOfType(this.definition.output);
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

    equals(concept: Concept) {
        return (
            concept instanceof StreamConcept &&
            concept.definition.constructor === this.definition.constructor
        );
    }
}
