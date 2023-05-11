import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type LanguageCode from '@translation/LanguageCode';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import Concept from './Concept';
import type Locale from '@translation/Locale';
import type Purpose from './Purpose';
import Emotion from '../lore/Emotion';
import type Doc from '../nodes/Doc';
import type Spaces from '../parser/Spaces';

export default class BindConcept extends Concept {
    /** The type this concept represents. */
    readonly bind: Bind;

    /** A derived reference to the bind */
    readonly reference: Reference;

    constructor(
        purpose: Purpose,
        bind: Bind,
        languages: LanguageCode[],
        context: Context
    ) {
        super(purpose, undefined, context);

        this.bind = bind;
        this.reference = Reference.make(
            this.bind.names.getLocaleText(languages),
            this.bind
        );
    }

    getGlyphs(languages: LanguageCode[]) {
        return {
            symbols: this.bind.names.getLocaleText(languages),
        };
    }

    getEmotion() {
        return Emotion.Kind;
    }

    getType() {
        return this.bind.getType(this.context);
    }

    hasName(name: string) {
        return this.bind.hasName(name);
    }

    getDocs(translation: Locale): [Doc, Spaces] | undefined {
        const doc = this.bind.docs?.getLocale(translation.language);
        return doc ? [doc, this.context.source.spaces] : undefined;
    }

    getName(translation: Locale) {
        return this.bind.names.getLocaleText(translation.language);
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
        return concept instanceof BindConcept && concept.bind === this.bind;
    }
}
