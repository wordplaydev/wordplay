import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Type from '@nodes/Type';
import type Step from '@runtime/Step';
import type Expression from '@nodes/Expression';
import { parseType, toTokens } from '@parser/Parser';
import type Evaluation from '@runtime/Evaluation';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type TypeSet from '@nodes/TypeSet';
import StartFinish from '@runtime/StartFinish';
import AtomicExpression from '@nodes/AtomicExpression';
import type Locale from '@locale/Locale';
import InternalException from '@values/InternalException';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';

export default class InternalExpression extends AtomicExpression {
    readonly type: Type;
    readonly evaluator: (requestor: Expression, evaluator: Evaluation) => Value;
    readonly steps: Step[];

    constructor(
        type: Type | string,
        steps: Step[],
        evaluator: (requestor: Expression, evaluator: Evaluation) => Value
    ) {
        super();

        if (typeof type === 'string') {
            const possibleType = parseType(toTokens(type));
            this.type = possibleType;
        } else this.type = type;

        this.steps = steps;
        this.evaluator = evaluator;
    }

    computeConflicts() {
        return;
    }

    getGrammar() {
        return [];
    }

    getPurpose() {
        return Purpose.Evaluate;
    }

    computeType(): Type {
        return this.type;
    }

    getDependencies(): Expression[] {
        return [];
    }

    isConstant() {
        return false;
    }

    compile(): Step[] {
        return this.steps.length === 0
            ? [new StartFinish(this)]
            : [new Start(this), ...this.steps, new Finish(this)];
    }

    evaluate(evaluator: Evaluator): Value {
        const evaluation = evaluator.getCurrentEvaluation();
        return evaluation === undefined
            ? new InternalException(
                  this,
                  evaluator,
                  'there is no evaluation, which should be impossible'
              )
            : this.evaluator(this, evaluation);
    }

    /** Can't clone basis expressions, there's only one of them! We just erase their parent and let whatever wants them claim them. */
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

    getNodeLocale(translation: Locale) {
        return translation.node.BasisExpression;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.BasisExpression.start);
    }

    getGlyphs() {
        return Glyphs.Basis;
    }
}
