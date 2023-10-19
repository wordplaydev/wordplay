import Concept from './Concept';
import type Node from '@nodes/Node';
import type Context from '@nodes/Context';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import { docToMarkup } from '@locale/Locale';
import type { Character } from '../tutorial/Tutorial';
import type Locales from '../locale/Locales';

export default class NodeConcept extends Concept {
    readonly template: Node;

    constructor(
        purpose: Purpose,
        type: StructureDefinition | undefined,
        template: Node,
        context: Context
    ) {
        super(purpose, type, context);

        this.template = template;
    }

    getGlyphs() {
        return this.template.getGlyphs();
    }

    /** Returns the emotions for the glyphs */
    getEmotion(locales: Locales) {
        return this.template.getNodeLocale(locales).emotion as Emotion;
    }

    /** Nodes can be matched by two names: the locale-specific one or the key in the locale
     * (e.g., FunctionDefinition, Evaluate).
     */
    hasName(name: string, locales: Locales): boolean {
        const nodeLocale = this.template.getNodeLocale(locales);
        const match = locales
            .getLocales()
            .map((locale) =>
                Object.entries(locale.node).find(
                    ([, value]) => value === nodeLocale
                )
            )
            .find((node) => node !== undefined);
        return match ? match[0] === name || match[1].name === name : false;
    }

    getDocs(locales: Locales): Markup | undefined {
        return docToMarkup(this.template.getDoc(locales)).concretize(
            locales,
            []
        );
    }

    getName(locales: Locales, symbolic: boolean) {
        return symbolic
            ? this.template.getGlyphs().symbols
            : this.template.getLabel(locales);
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

    getCharacter(locales: Locales): Character | undefined {
        const text = this.template.getNodeLocale(locales);
        const match = locales
            .getLocales()
            .map((l) => Object.entries(l.node).find(([, t]) => t === text))
            .find((n) => n !== undefined);
        return match ? (match[0] as Character) : undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof NodeConcept &&
            concept.template.isEqualTo(this.template)
        );
    }
}
