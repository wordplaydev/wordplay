import Token from './Token';
import type Expression from './Expression';
import NoneType from './NoneType';
import type Type from './Type';
import None from '../runtime/None';
import type Value from '../runtime/Value';
import type Step from '../runtime/Step';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { NONE_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';
import type Evaluator from '../runtime/Evaluator';
import StartFinish from '../runtime/StartFinish';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';
import AtomicExpression from './AtomicExpression';

export default class NoneLiteral extends AtomicExpression {
    readonly none: Token;

    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();
    }

    static make() {
        return new NoneLiteral(new Token(NONE_SYMBOL, TokenType.NONE));
    }

    getGrammar() {
        return [{ name: 'none', types: [Token] }];
    }

    clone(replace?: Replacement) {
        return new NoneLiteral(
            this.replaceChild('none', this.none, replace)
        ) as this;
    }

    computeConflicts() {}

    computeType(): Type {
        return NoneType.None;
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;
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
        return translation.expressions.NoneLiteral;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.NoneLiteral.start;
    }
}
