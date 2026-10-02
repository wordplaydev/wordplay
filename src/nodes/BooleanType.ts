import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { QUESTION_SYMBOL } from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import BasisType from '#nodes/BasisType.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type TypeSet from '#nodes/TypeSet.ts';

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

    static getPossibleInsertions() {
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
        return this.cloned(
            new BooleanType(this.replaceChild('type', this.type, replace)),
        );
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
