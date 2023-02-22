import type Conflict from '@conflicts/Conflict';
import type Translation from '@translation/Translation';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import { LINK_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';

export default class ConceptLink extends Node {
    readonly concept: Token;

    constructor(concept: Token) {
        super();

        this.concept = concept;
    }

    static make(concept: string) {
        return new ConceptLink(
            new Token(`${LINK_SYMBOL}${concept}`, TokenType.CONCEPT)
        );
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

    getGlyphs() {
        return Glyphs.Link;
    }
}
