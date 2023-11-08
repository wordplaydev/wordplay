import Token from './Token';
import Sym from './Sym';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import BasisType from './BasisType';
import type TypeSet from './TypeSet';
import type { BasisTypeName } from '../basis/BasisConstants';
import { node, type Grammar, type Replacement } from './Node';
import Glyphs from '../lore/Glyphs';
import type Locales from '../locale/Locales';

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

    getDescriptor() {
        return 'BooleanType';
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.BooleanType);
    }

    getGlyphs() {
        return Glyphs.BooleanType;
    }
}
