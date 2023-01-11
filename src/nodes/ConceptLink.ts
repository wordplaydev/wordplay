import type Conflict from '../conflicts/Conflict';
import type Translation from '../translations/Translation';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';

export default class ConceptLink extends Node {
    readonly concept: Token;

    constructor(concept: Token) {
        super();

        this.concept = concept;
    }

    getGrammar(): Field[] {
        return [{ name: 'concept', types: [Token] }];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new ConceptLink(
            this.replaceChild('concept', this.concept, replace)
        ) as this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.ConceptLink;
    }
}
