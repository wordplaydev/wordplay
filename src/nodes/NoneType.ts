import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { NONE_SYMBOL } from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import BasisType from '#nodes/BasisType.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import NoneLiteral from '#nodes/NoneLiteral.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type TypeSet from '#nodes/TypeSet.ts';

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

    static getPossibleInsertions() {
        return [NoneType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'NoneType';
    }

    getGrammar(): Grammar {
        return [{ name: 'none', kind: node(Sym.None), label: undefined }];
    }

    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new NoneType(this.replaceChild('none', this.none, replace)),
        );
    }

    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => type instanceof NoneType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'none';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NoneType;
    getLocalePath() {
        return NoneType.LocalePath;
    }

    getCharacter() {
        return Characters.None;
    }

    getDefaultExpression() {
        return NoneLiteral.make();
    }
}
