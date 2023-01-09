import Concept from './Concept';
import type Node from '../nodes/Node';
import type Context from '../nodes/Context';
import type Translation from '../translations/Translation';

export default class NodeConcept extends Concept {
    readonly template: Node;

    constructor(template: Node, context: Context) {
        super(context);

        this.template = template;
    }

    getDocs(translation: Translation) {
        return this.template.getPurpose(translation);
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
