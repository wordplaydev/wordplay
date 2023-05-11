import BooleanType from './BooleanType';
import Token from './Token';
import type Type from './Type';
import Bool from '@runtime/Bool';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeLink from '@locale/NodeLink';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';

export default class BooleanLiteral extends Literal {
    readonly value: Token;

    constructor(value: Token) {
        super();

        this.value = value;

        this.computeChildren();
    }

    static make(value: boolean) {
        return new BooleanLiteral(
            new Token(
                value === true ? TRUE_SYMBOL : FALSE_SYMBOL,
                TokenType.Boolean
            )
        );
    }

    getGrammar() {
        return [{ name: 'value', types: [Token] }];
    }

    clone(replace?: Replacement) {
        return new BooleanLiteral(
            this.replaceChild('value', this.value, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName | undefined {
        return 'boolean';
    }

    computeConflicts() {}

    computeType(): Type {
        return BooleanType.make();
    }

    getValue() {
        return new Bool(this, this.bool());
    }

    bool(): boolean {
        return this.value.text.toString() === TRUE_SYMBOL;
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

    getStart() {
        return this.value;
    }
    getFinish() {
        return this.value;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.BooleanLiteral;
    }

    getStartExplanations(translation: Locale, context: Context) {
        return translation.node.BooleanLiteral.start(
            new NodeLink(this.value, translation, context, this.value.getText())
        );
    }

    getGlyphs() {
        return Glyphs.BooleanLiteral;
    }
}
