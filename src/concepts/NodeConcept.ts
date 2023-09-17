import Concept from './Concept';
import type Node from '@nodes/Node';
import type Context from '@nodes/Context';
import type Locale from '@locale/Locale';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import { docToMarkup } from '@locale/Locale';
import type { Character } from '../tutorial/Tutorial';

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
    getEmotion(translation: Locale) {
        return this.template.getNodeLocale(translation).emotion as Emotion;
    }

    /** Nodes can be matched by two names: the locale-specific one or the key in the locale
     * (e.g., FunctionDefinition, Evaluate).
     */
    hasName(name: string, locale: Locale): boolean {
        const nodeLocale = this.template.getNodeLocale(locale);
        const match = Object.entries(locale.node).find(
            ([, value]) => value === nodeLocale
        );
        return match ? match[0] === name || match[1].name === name : false;
    }

    getDocs(locale: Locale): Markup | undefined {
        return docToMarkup(this.template.getDoc(locale)).concretize(locale, []);
    }

    getName(locale: Locale, symbolic: boolean) {
        return symbolic
            ? this.template.getGlyphs().symbols
            : this.template.getLabel(locale);
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

    getCharacter(locale: Locale): Character | undefined {
        const text = this.template.getNodeLocale(locale);
        const match = Object.entries(locale.node).find(([, t]) => t === text);
        return match ? (match[0] as Character) : undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof NodeConcept &&
            concept.template.isEqualTo(this.template)
        );
    }
}
