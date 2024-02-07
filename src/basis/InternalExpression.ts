import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Type from '@nodes/Type';
import type Step from '@runtime/Step';
import type Expression from '@nodes/Expression';
import type Evaluation from '@runtime/Evaluation';
import type TypeSet from '@nodes/TypeSet';
import StartFinish from '@runtime/StartFinish';
import SimpleExpression from '@nodes/SimpleExpression';
import InternalException from '@values/InternalException';
import Glyphs from '../lore/Glyphs';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import { toTokens } from '../parser/toTokens';
import parseType from '../parser/parseType';
import type Locales from '../locale/Locales';

export default class InternalExpression extends SimpleExpression {
    readonly type: Type;
    readonly evaluator: (requestor: Expression, evaluator: Evaluation) => Value;
    readonly steps: Step[];

    constructor(
        type: Type | string,
        steps: Step[],
        evaluator: (requestor: Expression, evaluator: Evaluation) => Value,
    ) {
        super();

        if (typeof type === 'string') {
            const possibleType = parseType(toTokens(type));
            this.type = possibleType;
        } else this.type = type;

        this.steps = steps;
        this.evaluator = evaluator;
    }

    getDescriptor() {
        return 'InternalExpression';
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
                  'there is no evaluation, which should be impossible',
              )
            : this.evaluator(this, evaluation);
    }

    /** Can't clone basis expressions, there's only one of them! We just erase their parent and let whatever wants them claim them. */
    clone() {
        return this;
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this;
    }

    getFinish() {
        return this;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.InternalExpression);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.InternalExpression.start),
        );
    }

    getGlyphs() {
        return Glyphs.Basis;
    }
}
