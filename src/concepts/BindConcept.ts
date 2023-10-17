import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import Concept from './Concept';
import type Purpose from './Purpose';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import type { Character } from '../tutorial/Tutorial';
import type Locales from '../locale/Locales';

export default class BindConcept extends Concept {
    /** The type this concept represents. */
    readonly bind: Bind;

    /** A derived reference to the bind */
    readonly reference: Reference;

    constructor(
        purpose: Purpose,
        bind: Bind,
        locales: Locales,
        context: Context
    ) {
        super(purpose, undefined, context);

        this.bind = bind;
        this.reference = Reference.make(
            locales.getName(this.bind.names),
            this.bind
        );
    }

    getGlyphs(locales: Locales) {
        return {
            symbols: locales.getName(this.bind.names),
        };
    }

    getEmotion() {
        return Emotion.kind;
    }

    getType() {
        return this.bind.getType(this.context);
    }

    hasName(name: string) {
        return this.bind.hasName(name);
    }

    getDocs(locales: Locales): Markup | undefined {
        const doc = this.bind.docs?.getPreferredLocale(locales);
        return doc?.markup?.concretize(locales, []);
    }

    getName(locales: Locales, symbolic: boolean) {
        return locales.getName(this.bind.names, symbolic);
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

    getCharacter(): Character | undefined {
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return concept instanceof BindConcept && concept.bind === this.bind;
    }
}
