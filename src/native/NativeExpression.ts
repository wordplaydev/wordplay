import type Evaluator from '../runtime/Evaluator';
import type Value from 'src/runtime/Value';
import type Type from '../nodes/Type';
import type Step from 'src/runtime/Step';
import type Expression from '../nodes/Expression';
import { parseType, toTokens } from '../parser/Parser';
import type Evaluation from '../runtime/Evaluation';
import type Bind from '../nodes/Bind';
import type Context from '../nodes/Context';
import type TypeSet from '../nodes/TypeSet';
import StartFinish from '../runtime/StartFinish';
import AtomicExpression from '../nodes/AtomicExpression';
import type Translation from '../translations/Translation';
import InternalException from '../runtime/InternalException';

export default class NativeExpression extends AtomicExpression {
    readonly type: Type;
    readonly evaluator: (requestor: Expression, evaluator: Evaluation) => Value;

    constructor(
        type: Type | string,
        evaluator: (requestor: Expression, evaluator: Evaluation) => Value
    ) {
        super();

        if (typeof type === 'string') {
            let possibleType = parseType(toTokens(type));
            this.type = possibleType;
        } else this.type = type;

        this.evaluator = evaluator;
    }

    computeConflicts() {}

    getGrammar() {
        return [];
    }

    computeType(): Type {
        return this.type;
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator): Value {
        const evaluation = evaluator.getCurrentEvaluation();
        return evaluation === undefined
            ? new InternalException(
                  evaluator,
                  'there is no evaluation, which should be impossible'
              )
            : this.evaluator(this, evaluation);
    }

    /** Can't clone native expressions, there's only one of them! We just erase their parent and let whatever wants them claim them. */
    clone() {
        return this;
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        context;
        bind;
        original;
        return current;
    }

    getStart() {
        return this;
    }

    getFinish() {
        return this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.expressions.NativeExpression;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.NativeExpression.start;
    }
}
