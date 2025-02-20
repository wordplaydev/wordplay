import type { NodeDescriptor } from '@locale/NodeTexts';
import type Expression from '@nodes/Expression';
import SimpleExpression from '@nodes/SimpleExpression';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import InternalException from '@values/InternalException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import parseType from '../parser/parseType';
import { toTokens } from '../parser/toTokens';

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

    getDescriptor(): NodeDescriptor {
        return 'InternalExpression';
    }

    computeConflicts() {
        return [];
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

    isInternal() {
        return true;
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
        return locales.concretize((l) => l.node.InternalExpression.start);
    }

    getCharacter() {
        return Characters.Basis;
    }
}
