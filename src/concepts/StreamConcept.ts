import type Context from '../nodes/Context';
import type LanguageCode from '../translation/LanguageCode';
import type Node from '../nodes/Node';
import Reference from '../nodes/Reference';
import StreamType from '../nodes/StreamType';
import type Stream from '../runtime/Stream';
import Concept from './Concept';
import type ConceptIndex from './ConceptIndex';
import type Translation from '../translation/Translation';
import Purpose from './Purpose';

export default class StreamConcept extends Concept {
    /** The type this concept represents. */
    readonly stream: Stream;

    /** A derived reference to the stream */
    readonly reference: Reference;

    constructor(stream: Stream, languages: LanguageCode[], context: Context) {
        super(Purpose.INPUT, undefined, context);

        this.stream = stream;
        this.reference = Reference.make(
            stream.names.getTranslation(languages),
            this.stream
        );
    }

    hasName(name: string) {
        return this.stream.names.hasName(name);
    }

    getDocs(translation: Translation) {
        return this.stream.docs?.getTranslation(translation.language);
    }

    getName(translation: Translation) {
        return this.stream.names.getTranslation(translation.language);
    }

    getTypeConcept(index: ConceptIndex): Concept | undefined {
        const type = this.stream.getType(this.context);
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
            concept.stream.constructor === this.stream.constructor
        );
    }
}
