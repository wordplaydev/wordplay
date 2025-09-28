import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { NONE_SYMBOL } from '@parser/Symbols';
import NoneValue from '@values/NoneValue';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Literal from './Literal';
import { node, type Grammar, type Replacement } from './Node';
import NoneType from './NoneType';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

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

    static getPossibleReplacements({ type, context }: EditContext) {
        return type === undefined || type.accepts(NoneType.make(), context)
            ? [NoneLiteral.make()]
            : [];
    }

    static getPossibleAppends(context: EditContext) {
        return this.getPossibleReplacements(context);
    }

    clone(replace?: Replacement) {
        return new NoneLiteral(
            this.replaceChild('none', this.none, replace),
        ) as this;
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
