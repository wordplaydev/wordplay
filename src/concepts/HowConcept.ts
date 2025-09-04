import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Words from '@nodes/Words';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from './Concept';
import type HowTo from './HowTo';
import Purpose from './Purpose';

/** Represents how to do something with Wordplay, backed by a how document. */
export default class HowConcept extends Concept {
    /** The type this concept represents. */
    readonly how: HowTo;

    constructor(how: HowTo, context: Context) {
        super(Purpose.How, undefined, context);

        this.how = how;
    }

    /** A how's character is function definition, since it does all the explaining. */
    getCharacter(_: Locales) {
        return Characters.FunctionDefinition;
    }

    getEmotion() {
        return Emotion.kind;
    }

    hasName(id: string) {
        return this.how.id === id;
    }

    getDocs(): Markup[] {
        return [this.how.content];
    }

    getNames() {
        return [this.how.title];
    }

    getName() {
        return this.how.title;
    }

    getRepresentation() {
        return (
            this.how.content.getExamples()[0]?.program.expression ??
            this.how.content
        );
    }

    // All the examples, to enable dragging
    getNodes(): Set<Node> {
        return new Set(this.how.content.getExamples());
    }

    // All the text in the title and content
    getText(): Set<string> {
        return new Set([
            this.how.title,
            ...this.how.content
                .nodes()
                .filter((n) => n instanceof Words)
                .map((w) => w.toWordplay()),
        ]);
    }

    /** All of the concepts referenced in the content */
    getSubConcepts(): Set<Concept> {
        return new Set();
    }

    getCharacterName(): CharacterName | undefined {
        return this.how.id;
    }

    isEqualTo(concept: Concept) {
        return concept instanceof HowConcept && concept.how.id === this.how.id;
    }
}
