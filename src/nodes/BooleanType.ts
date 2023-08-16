import Token from './Token';
import Sym from './Sym';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import BasisType from './BasisType';
import type TypeSet from './TypeSet';
import type { BasisTypeName } from '../basis/BasisConstants';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';

export default class BooleanType extends BasisType {
    readonly type: Token;

    constructor(type: Token) {
        super();

        this.type = type;

        this.computeChildren();
    }

    static make() {
        return new BooleanType(new Token(QUESTION_SYMBOL, Sym.BooleanType));
    }

    static getPossibleNodes() {
        return [BooleanType.make()];
    }

    getGrammar(): Grammar {
        return [{ name: 'type', kind: node(Sym.BooleanType) }];
    }

    clone(replace?: Replacement) {
        return new BooleanType(
            this.replaceChild('type', this.type, replace)
        ) as this;
    }

    computeConflicts() {
        return;
    }

    acceptsAll(types: TypeSet) {
        return types.list().every((type) => type instanceof BooleanType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'boolean';
    }

    getNodeLocale(translation: Locale) {
        return translation.node.BooleanType;
    }

    getGlyphs() {
        return Glyphs.BooleanType;
    }
}
