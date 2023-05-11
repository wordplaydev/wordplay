import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import { LINK_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';
import Purpose from '../concepts/Purpose';

export default class ConceptLink extends Node {
    readonly concept: Token;

    constructor(concept: Token) {
        super();

        this.concept = concept;
    }

    static make(concept: string) {
        return new ConceptLink(
            new Token(`${LINK_SYMBOL}${concept}`, TokenType.Concept)
        );
    }

    getGrammar(): Field[] {
        return [{ name: 'concept', types: [Token] }];
    }

    clone(replace?: Replacement | undefined): this {
        return new ConceptLink(
            this.replaceChild('concept', this.concept, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    getNodeLocale(translation: Locale) {
        return translation.node.ConceptLink;
    }

    getGlyphs() {
        return Glyphs.Link;
    }
}
