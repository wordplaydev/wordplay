import Concept from './Concept';
import type Node from '@nodes/Node';
import type Context from '@nodes/Context';
import type Locale from '@locale/Locale';
import { parseDoc, toTokens } from '@parser/Parser';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Spaces from '../parser/Spaces';
import type Doc from '../nodes/Doc';
import type Emotion from '../lore/Emotion';

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

    getDocs(translation: Locale): [Doc, Spaces] | undefined {
        const tokens = toTokens('`' + this.template.getDoc(translation) + '`');
        return [parseDoc(tokens), tokens.getSpaces()];
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

    equals(concept: Concept) {
        return (
            concept instanceof NodeConcept &&
            concept.template.isEqualTo(this.template)
        );
    }
}
