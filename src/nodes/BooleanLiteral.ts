import BooleanType from './BooleanType';
import type Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Value from '../runtime/Value';
import Bool from '../runtime/Bool';
import type Step from '../runtime/Step';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Symbols';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import type Evaluator from '../runtime/Evaluator';
import StartFinish from '../runtime/StartFinish';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';
import AtomicExpression from './AtomicExpression';
import NodeLink from '../translations/NodeLink';

export default class BooleanLiteral extends AtomicExpression {
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

    getStart() {
        return this.value;
    }
    getFinish() {
        return this.value;
    }

    getNodeTranslation(translation: Translation) {
        return translation.expressions.BooleanLiteral;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.expressions.BooleanLiteral.start(
            new NodeLink(this.value, translation, context, this.value.getText())
        );
    }
}
