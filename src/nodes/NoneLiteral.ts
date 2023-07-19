import Token from './Token';
import NoneType from './NoneType';
import type Type from './Type';
import None from '@runtime/None';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { NONE_SYMBOL } from '@parser/Symbols';
import TokenType from './TokenType';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import type { NativeTypeName } from '../native/NativeConstants';
import concretize from '../locale/concretize';

export default class NoneLiteral extends Literal {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    static make() {
        return new NoneLiteral(new Token(NONE_SYMBOL, TokenType.None));
    }

    getGrammar(): Grammar {
        return [{ name: 'none', types: node(TokenType.None) }];
    }

    clone(replace?: Replacement) {
        return new NoneLiteral(
            this.replaceChild('none', this.none, replace)
        ) as this;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'none';
    }

    computeConflicts() {}

    computeType(): Type {
        return NoneType.None;
    }

    getValue() {
        return new None(this);
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
