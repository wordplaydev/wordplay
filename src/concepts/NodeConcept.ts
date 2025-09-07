import { docToMarkup } from '@locale/LocaleText';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Locales from '../locale/Locales';
import type Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import type { CharacterName } from '../tutorial/Tutorial';
import Concept from './Concept';
import type Purpose from './Purpose';

export default class NodeConcept extends Concept {
    readonly template: Node;

    constructor(
        purpose: Purpose,
        type: StructureDefinition | undefined,
        template: Node,
        context: Context,
    ) {
        super(purpose, type, context);

        this.template = template;
    }

    getCharacter(locales: Locales) {
        return this.template.getCharacter(locales);
    }

    /** Returns the emotions for the characters */
    getEmotion(locales: Locales) {
        return locales.get(this.template.getLocalePath()).emotion as Emotion;
    }

    /** Nodes can be matched by two names: the locale-specific one or the key in the locale
     * (e.g., FunctionDefinition, Evaluate).
     */
    hasName(name: string, locales: Locales): boolean {
        if (this.template.getDescriptor() === name) return true;

        const match = locales
            .getLocales()
            .map((locale) =>
                Object.entries(locale.node).find(
                    ([key]) => key === this.template.getDescriptor(),
                ),
            )
            .find((node) => node !== undefined);

        return match ? match[0] === name || match[1].name === name : false;
    }

    getDocs(locales: Locales): Markup[] {
        return locales
            .getLocales()
            .map((l) => this.template.getLocalePath()(l))
            .map((text) => docToMarkup(text.doc).concretize(locales, []))
            .filter((m) => m !== undefined);
    }

    getName(locales: Locales, symbolic: boolean) {
        return symbolic
            ? this.template.getCharacter(locales).symbols
            : this.template.getLabel(locales);
    }

    getNames(locales: Locales, symbolic: boolean) {
        return symbolic
            ? [this.template.getCharacter(locales).symbols]
            : [this.template.getLabel(locales)];
    }

    getRepresentation() {
        return this.template;
    }

    getNodes(): Set<Node> {
        return new Set([this.template]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getSubConcepts(): Set<Concept> {
        return new Set();
    }

    getCharacterName(locales: Locales): CharacterName | undefined {
        const text = locales.get(this.template.getLocalePath());
        const match = locales
            .getLocales()
            .map((l) => Object.entries(l.node).find(([, t]) => t === text))
            .find((n) => n !== undefined);
        return match ? (match[0] as CharacterName) : undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof NodeConcept &&
            concept.template.isEqualTo(this.template)
        );
    }
}
