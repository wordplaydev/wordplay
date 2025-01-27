import type { BasisTypeName } from '../basis/BasisConstants';
import { NONE_SYMBOL } from '@parser/Symbols';
import BasisType from './BasisType';
import { node, type Grammar, type Replacement } from './Node';
import Token from './Token';
import Sym from './Sym';
import type TypeSet from './TypeSet';
import Characters from '../lore/BasisCharacters';
import type Locales from '../locale/Locales';
import NoneLiteral from './NoneLiteral';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class NoneType extends BasisType {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    static None = new NoneType(new Token(NONE_SYMBOL, Sym.None));

    static make() {
        return new NoneType(new Token(NONE_SYMBOL, Sym.None));
    }

    static getPossibleReplacements() {
        return [NoneType.make()];
    }

    static getPossibleAppends() {
        return [NoneType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'NoneType';
    }

    getGrammar(): Grammar {
        return [{ name: 'none', kind: node(Sym.None) }];
    }

    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement) {
        return new NoneType(
            this.replaceChild('none', this.none, replace),
        ) as this;
    }

    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => type instanceof NoneType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'none';
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.NoneType);
    }

    getCharacter() {
        return Characters.None;
    }

    getDefaultExpression() {
        return NoneLiteral.make();
    }
}
