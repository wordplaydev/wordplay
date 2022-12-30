import BooleanType from './BooleanType';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Value from '../runtime/Value';
import Bool from '../runtime/Bool';
import type Step from '../runtime/Step';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Tokenizer';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import type Evaluator from '../runtime/Evaluator';
import StartFinish from '../runtime/StartFinish';
import type { Replacement } from './Node';

export default class BooleanLiteral extends Expression {
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
                TokenType.BOOLEAN
            )
        );
    }

    getGrammar() {
        return [{ name: 'value', types: [Token] }];
    }

    computeConflicts() {}

    computeType(): Type {
        return BooleanType.make();
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
        return new Bool(this, this.bool());
    }

    bool(): boolean {
        return this.value.text.toString() === TRUE_SYMBOL;
    }

    clone(replace?: Replacement) {
        return new BooleanLiteral(
            this.replaceChild('value', this.value, replace)
        ) as this;
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

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `${this.bool() ? 'True' : 'False'}`,
        };
    }

    getStart() {
        return this.value;
    }
    getFinish() {
        return this.value;
    }

    getStartExplanations(): Translations {
        return this.getFinishExplanations();
    }

    getFinishExplanations(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'Evaluate to a bool',
        };
    }
}
