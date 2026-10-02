import Concept from '#concepts/Concept.ts';
import { pickPreviewExample } from '#concepts/pickPreviewExample.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type HowTo from '#db/howtos/HowToDatabase.svelte.ts';
import Locales from '#locale/Locales.ts';
import type Context from '#nodes/Context.ts';
import type Example from '#nodes/Example.ts';
import Markup from '#nodes/Markup.ts';
import type Node from '#nodes/Node.ts';
import Words from '#nodes/Words.ts';
import { toMarkup } from '#parser/toMarkup.ts';
import type CharacterSymbols from '../lore/BasisCharacter';
import Characters from '../lore/BasisCharacters';
import { Emotion } from '../lore/Emotion';
import type { CharacterName } from '../tutorial/Tutorial';

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

    /** The example whose output drives this how-to's preview: the starred (`⭐`)
     *  example, else the first, else none. */
    getPreviewExample(): Example | undefined {
        return pickPreviewExample(
            toMarkup(this.howTo.getText().join('\n\n'))[0],
        );
    }

    getNames(locales: Locales): string[] {
        return [this.getName(locales)];
    }

    getName(locales: Locales): string {
        return this.howTo.getTitleInLocale(locales.getLocaleString());
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

    getHowToId(): string {
        return this.howTo.getHowToId();
    }
}
