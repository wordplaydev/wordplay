import Concept from './Concept';
import type Node from '@nodes/Node';
import type Context from '@nodes/Context';
import type Locale from '@translation/Locale';
import { parseDoc, toTokens } from '@parser/Parser';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Spaces from '../parser/Spaces';
import type Doc from '../nodes/Doc';

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
        return this.template.getNodeLocale(translation).emotion;
    }

    hasName(name: string, translation: Locale): boolean {
        const nodeLocale = this.template.getNodeLocale(translation);
        const match = Object.entries(translation.node).find(
            ([, value]) => value === nodeLocale
        );
        return match ? match[0] === name : false;
    }

    getDocs(translation: Locale): [Doc, Spaces] | undefined {
        const tokens = toTokens('`' + this.template.getDoc(translation) + '`');
        return [parseDoc(tokens), tokens.getSpaces()];
    }

    getName(translation: Locale) {
        return this.template.getLabel(translation);
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
