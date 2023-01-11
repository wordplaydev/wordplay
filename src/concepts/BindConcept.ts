import type Bind from '../nodes/Bind';
import type Context from '../nodes/Context';
import type LanguageCode from '../translations/LanguageCode';
import type Node from '../nodes/Node';
import Reference from '../nodes/Reference';
import Concept from './Concept';
import type Translation from '../translations/Translation';

export default class BindConcept extends Concept {
    /** The type this concept represents. */
    readonly bind: Bind;

    /** A derived reference to the bind */
    readonly reference: Reference;

    constructor(bind: Bind, languages: LanguageCode[], context: Context) {
        super(context);

        this.bind = bind;
        this.reference = Reference.make(
            this.bind.names.getTranslation(languages),
            this.bind
        );
    }

    hasName(name: string) {
        return this.bind.hasName(name);
    }

    getDocs(translation: Translation) {
        return this.bind.docs?.getTranslation(translation.language);
    }

    getDescription(translation: Translation) {
        return this.bind.getDescription(translation);
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

    getConcepts(): Set<Concept> {
        return new Set();
    }

    equals(concept: Concept) {
        return concept instanceof BindConcept && concept.bind === this.bind;
    }
}
