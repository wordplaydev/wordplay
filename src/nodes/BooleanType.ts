import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { QUESTION_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import BasisType from './BasisType';
import BooleanLiteral from './BooleanLiteral';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import type TypeSet from './TypeSet';

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

    static getPossibleReplacements() {
        return [BooleanType.make()];
    }

    static getPossibleAppends() {
        return [BooleanType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'BooleanType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'type', kind: node(Sym.BooleanType), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new BooleanType(
            this.replaceChild('type', this.type, replace),
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    acceptsAll(types: TypeSet) {
        return types.list().every((type) => type instanceof BooleanType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'boolean';
    }

    static readonly LocalePath = (l: LocaleText) => l.node.BooleanType;
    getLocalePath() {
        return BooleanType.LocalePath;
    }

    getCharacter() {
        return Characters.BooleanType;
    }

    getDefaultExpression() {
        return BooleanLiteral.make(true);
    }
}
