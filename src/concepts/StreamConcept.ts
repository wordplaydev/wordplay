import type Context from '@nodes/Context';
import type LanguageCode from '@translation/LanguageCode';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import StreamType from '@nodes/StreamType';
import Concept from './Concept';
import type ConceptIndex from './ConceptIndex';
import type Translation from '@translation/Translation';
import Purpose from './Purpose';
import type StreamDefinition from '../nodes/StreamDefinition';
import Emotion from '../lore/Emotion';
import type Doc from '../nodes/Doc';
import type Spaces from '../parser/Spaces';

export default class StreamConcept extends Concept {
    /** The type this concept represents. */
    readonly definition: StreamDefinition;

    /** A derived reference to the stream */
    readonly reference: Reference;

    constructor(
        stream: StreamDefinition,
        languages: LanguageCode[],
        context: Context
    ) {
        super(Purpose.INPUT, undefined, context);

        this.definition = stream;
        this.reference = Reference.make(
            stream.names.getTranslation(languages),
            this.definition
        );
    }

    getGlyphs(languages: LanguageCode[]) {
        return {
            symbols: this.definition.names.getTranslation(languages),
            emotion: Emotion.Restless,
        };
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(translation: Translation): [Doc, Spaces] | undefined {
        const doc = this.definition.docs?.getTranslation(translation.language);
        return doc ? [doc, this.context.source.spaces] : undefined;
    }

    getName(translation: Translation) {
        return this.definition.names.getTranslation(translation.language);
    }

    getTypeConcept(index: ConceptIndex): Concept | undefined {
        const type = this.definition.getType(this.context);
        return type instanceof StreamType
            ? index.getConceptOfType(type.type)
            : undefined;
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
        return new Set();
    }

    equals(concept: Concept) {
        return (
            concept instanceof StreamConcept &&
            concept.definition.constructor === this.definition.constructor
        );
    }
}
