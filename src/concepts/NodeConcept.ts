import Concept from './Concept';
import type Node from '@nodes/Node';
import type Context from '@nodes/Context';
import type Translation from '@translation/Translation';
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

    hasName(name: string, translation: Translation): boolean {
        const nodeTranslation = this.template.getNodeTranslation(translation);
        const match = Object.entries(translation.nodes).find(
            ([, value]) => value === nodeTranslation
        );
        return match ? match[0] === name : false;
    }

    getDocs(translation: Translation): [Doc, Spaces] | undefined {
        const tokens = toTokens('`' + this.template.getDoc(translation) + '`');
        return [parseDoc(tokens), tokens.getSpaces()];
    }

    getName(translation: Translation) {
        return this.template.getDescription(translation, this.context);
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
            concept.template.equals(this.template)
        );
    }
}
