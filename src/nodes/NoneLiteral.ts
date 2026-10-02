import { Purpose } from '#concepts/Purpose.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { NONE_SYMBOL } from '#parser/Symbols.ts';
import NoneValue from '#values/NoneValue.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import Literal from '#nodes/Literal.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import NoneType from '#nodes/NoneType.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class NoneLiteral extends Literal {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'NoneLiteral';
    }

    getPurpose() {
        return Purpose.Truth;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'none',
                kind: node(Sym.None),
                getType: () => NoneType.make(),
                label: undefined,
            },
        ];
    }

    static make() {
        return new NoneLiteral(new Token(NONE_SYMBOL, Sym.None));
    }

    static getPossibleReplacements({ type, context }: ReplaceContext) {
        // Only offer to replace an expression with ø where the expected type
        // explicitly admits it (e.g. an optional input); it's noise elsewhere.
        return type !== undefined && type.accepts(NoneType.make(), context)
            ? [NoneLiteral.make()]
            : [];
    }

    static getPossibleInsertions() {
        return [NoneLiteral.make()];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new NoneLiteral(this.replaceChild('none', this.none, replace)),
        );
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'none';
    }

    computeConflicts() {
        return [];
    }

    computeType(): Type {
        return NoneType.None;
    }

    getValue() {
        return new NoneValue(this);
    }

    getStart() {
        return this.none;
    }
    getFinish() {
        return this.none;
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NoneLiteral;
    getLocalePath() {
        return NoneLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.NoneLiteral.start);
    }

    getCharacter() {
        return Characters.None;
    }
}
