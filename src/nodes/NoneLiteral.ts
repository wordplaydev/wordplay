import Token from './Token';
import NoneType from './NoneType';
import type Type from './Type';
import None from '@runtime/None';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { NONE_SYMBOL } from '@parser/Symbols';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

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

    getGrammar() {
        return [{ name: 'none', types: [Token] }];
    }

    clone(replace?: Replacement) {
        return new NoneLiteral(
            this.replaceChild('none', this.none, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
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

    getNodeTranslation(translation: Translation) {
        return translation.node.NoneLiteral;
    }

    getStartExplanations(translation: Translation) {
        return translation.node.NoneLiteral.start;
    }

    getGlyphs() {
        return Glyphs.None;
    }
}
