import BooleanType from './BooleanType';
import Token from './Token';
import type Type from './Type';
import Bool from '@runtime/Bool';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import Symbol from './Symbol';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import type { BasisTypeName } from '../basis/BasisConstants';
import concretize from '../locale/concretize';

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
                Symbol.Boolean
            )
        );
    }

    static getPossibleNodes() {
        return [BooleanLiteral.make(true), BooleanLiteral.make(false)];
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'value',
                kind: node(Symbol.Boolean),
                getType: () => BooleanType.make(),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new BooleanLiteral(
            this.replaceChild('value', this.value, replace)
        ) as this;
    }

    getAffiliatedType(): BasisTypeName | undefined {
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

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.BooleanLiteral.start,
            new NodeRef(this.value, locale, context, this.value.getText())
        );
    }

    getDescriptionInputs() {
        return [this.bool()];
    }

    getGlyphs() {
        return Glyphs.BooleanLiteral;
    }

    adjust(): this | undefined {
        return BooleanLiteral.make(!this.bool()) as this;
    }
}
