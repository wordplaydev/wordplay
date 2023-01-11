import Concept from './Concept';
import type Node from '../nodes/Node';
import type Context from '../nodes/Context';
import type Translation from '../translation/Translation';
import { parseDoc, toTokens } from '../parser/Parser';

export default class NodeConcept extends Concept {
    readonly template: Node;

    constructor(template: Node, context: Context) {
        super(context);

        this.template = template;
    }

    hasName(name: string, translation: Translation): boolean {
        const nodeTranslation = this.template.getNodeTranslation(translation);
        const match = Object.entries(translation.nodes).find(
            ([, value]) => value === nodeTranslation
        );
        return match ? match[0] === name : false;
    }

    getDocs(translation: Translation) {
        const tokens = toTokens(
            '`' + this.template.getPurpose(translation) + '`'
        );
        return parseDoc(tokens);
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

    getConcepts(): Set<Concept> {
        return new Set();
    }

    equals(concept: Concept) {
        return (
            concept instanceof NodeConcept &&
            concept.template.equals(this.template)
        );
    }
}
