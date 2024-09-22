import Token from './Token';
import NoneType from './NoneType';
import type Type from './Type';
import NoneValue from '@values/NoneValue';
import type TypeSet from './TypeSet';
import { NONE_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import { node, type Grammar, type Replacement } from './Node';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import type EditContext from '@edit/EditContext';

export default class NoneLiteral extends Literal {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    getDescriptor() {
        return 'NoneLiteral';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'none',
                kind: node(Sym.None),
                getType: () => NoneType.make(),
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.NoneLiteral);
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.NoneLiteral.start);
    }

    getGlyphs() {
        return Glyphs.None;
    }
}
