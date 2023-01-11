import Concept from './Concept';
import type Node from '../nodes/Node';
import type Context from '../nodes/Context';
import type Translation from '../translations/Translation';
import { parseDoc, toTokens } from '../parser/Parser';
import type Spaces from '../parser/Spaces';
import type Doc from '../nodes/Doc';

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

    getDocs(translation: Translation): [Doc, Spaces] | undefined {
        const tokens = toTokens(this.template.getPurpose(translation));
        const doc = parseDoc(tokens);
        return [doc, tokens.getSpaces()];
    }

    getDescription(translation: Translation) {
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
