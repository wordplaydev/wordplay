import Token from './Token';
import NoneType from './NoneType';
import type Type from './Type';
import NoneValue from '@values/NoneValue';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { NONE_SYMBOL } from '@parser/Symbols';
import Symbol from './Symbol';
import Node, { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import type { BasisTypeName } from '../basis/BasisConstants';
import concretize from '../locale/concretize';

export default class NoneLiteral extends Literal {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'none',
                kind: node(Symbol.None),
                getType: () => NoneType.make(),
            },
        ];
    }

    static make() {
        return new NoneLiteral(new Token(NONE_SYMBOL, Symbol.None));
    }

    static getPossibleNodes(
        type: Type | undefined,
        _: Node,
        __: boolean,
        context: Context
    ) {
        return type === undefined ||
            type.getPossibleTypes(context).some((t) => t instanceof NoneType)
            ? [NoneLiteral.make()]
            : [];
    }

    clone(replace?: Replacement) {
        return new NoneLiteral(
            this.replaceChild('none', this.none, replace)
        ) as this;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'none';
    }

    computeConflicts() {}

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

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getNodeLocale(locale: Locale) {
        return locale.node.NoneLiteral;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.NoneLiteral.start);
    }

    getGlyphs() {
        return Glyphs.None;
    }
}
