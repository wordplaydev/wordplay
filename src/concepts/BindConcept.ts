import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
import { COMMA_SYMBOL } from '@parser/Symbols';
import type Locales from '../locale/Locales';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from './Concept';
import type Purpose from './Purpose';

export default class BindConcept extends Concept {
    /** The type this concept represents. */
    readonly bind: Bind;

    /** A derived reference to the bind */
    readonly reference: Reference;

    constructor(
        purpose: Purpose,
        bind: Bind,
        locales: Locales,
        context: Context,
    ) {
        super(purpose, undefined, context);

        this.bind = bind;
        this.reference = Reference.make(
            locales.getName(this.bind.names),
            this.bind,
        );
    }

    getCharacter(locales: Locales) {
        return {
            symbols: this.bind.names.getLocaleNames(locales).join(COMMA_SYMBOL),
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

    getDocs(locales: Locales): Markup[] {
        return (this.bind.docs?.docs ?? [])
            .map((doc) => doc.markup.concretize(locales, []))
            .filter((m) => m !== undefined);
    }

    getNames(): string[] {
        return this.bind.names.getNames();
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

    getCharacterName(): CharacterName | undefined {
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return concept instanceof BindConcept && concept.bind === this.bind;
    }
}
