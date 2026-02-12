import type HowTo from '@db/howtos/HowToDatabase.svelte';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import Markup from '@nodes/Markup';
import type Node from '@nodes/Node';
import Words from '@nodes/Words';
import { toMarkup } from '@parser/toMarkup';
import type CharacterSymbols from '../lore/BasisCharacter';
import Characters from '../lore/BasisCharacters';
import Emotion from '../lore/Emotion';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from './Concept';
import Purpose from './Purpose';

// modified from HowConcept.ts

export default class GalleryHowConcept extends Concept {
    readonly howTo: HowTo;

    constructor(howTo: HowTo, context: Context) {
        super(Purpose.GalleryHow, undefined, context);

        this.howTo = howTo;
    }

    getCharacter(): CharacterSymbols {
        return Characters.FunctionDefinition;
    }

    getCharacterName(): CharacterName | undefined {
        return 'gallery-how-to';
    }

    getEmotion(): Emotion {
        return Emotion.kind;
    }

    hasName(name: string): boolean {
        return name === this.howTo.getTitle();
    }

    getRepresentation(): Node {
        let markup = toMarkup(this.howTo.getText().join('\n\n'))[0];

        return markup.getExamples()[0]?.program.expression ?? markup;
    }

    getNames(): string[] {
        return [this.howTo.getTitle()];
    }

    getName(): string {
        return this.howTo.getTitle();
    }

    getDocs(_: Locales): Markup[] {
        return this.howTo.getText().map((text) => toMarkup(text)[0]);
    }

    getNodes(): Set<Node> {
        return new Set(
            this.howTo
                .getText()
                .map((text) => toMarkup(text)[0].getExamples())
                .flat(),
        );
    }

    getText(): Set<string> {
        return new Set([
            this.howTo.getTitle(),
            ...toMarkup(this.howTo.getText().join('\n\n'))[0]
                .nodes()
                .filter((n) => n instanceof Words)
                .map((w) => w.toWordplay()),
        ]);
    }

    getSubConcepts(): Set<Concept> {
        return new Set();
    }

    isEqualTo(concept: Concept): boolean {
        return (
            concept instanceof GalleryHowConcept &&
            concept.howTo.getHowToId() === this.howTo.getHowToId()
        );
    }

    getPath(): string {
        return `/gallery/${this.howTo.getHowToGalleryId()}/howto?id=${this.howTo.getHowToId()}`;
    }
}
