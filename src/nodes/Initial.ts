import type Conflict from '@conflicts/Conflict';
import type Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import { INITIAL_SYMBOL } from '@parser/Symbols';
import Bool from '@runtime/Bool';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import AtomicExpression from './AtomicExpression';
import BooleanType from './BooleanType';
import StartFinish from '../runtime/StartFinish';
import type Node from './Node';

export default class Initial extends AtomicExpression {
    readonly diamond: Token;

    constructor(change: Token) {
        super();

        this.diamond = change;

        this.computeChildren();
    }

    static make() {
        return new Initial(new Token(INITIAL_SYMBOL, TokenType.INITIAL));
    }

    getGrammar() {
        return [{ name: 'diamond', types: [Token] }];
    }

    clone(replace?: Replacement) {
        return new Initial(
            this.replaceChild('diamond', this.diamond, replace)
        ) as this;
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    computeType(): Type {
        return BooleanType.make();
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return new Bool(this, evaluator.isInitialEvaluation());
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet) {
        return current;
    }

    getStart() {
        return this.diamond;
    }

    getFinish(): Node {
        return this.diamond;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Initial;
    }

    getStartExplanations(translation: Translation) {
        return translation.nodes.Initial.description;
    }
}
