import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type Expression from '#nodes/Expression.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import StartFinish from '#runtime/StartFinish.ts';
import type Step from '#runtime/Step.ts';
import InternalException from '#values/InternalException.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import parseType from '#parser/parseType.ts';
import { toTokens } from '#parser/toTokens.ts';

export default class InternalExpression extends SimpleExpression {
    readonly type: Type;
    readonly evaluator: (requestor: Expression, evaluator: Evaluation) => Value;
    /**
     * The body's steps — either a fixed list, or a builder that produces them at
     * compile time given this node, so a step can reference it (e.g. a loop that
     * single-steps — see the pattern `≈`/`⌕` functions).
     */
    readonly steps: Step[] | ((expr: InternalExpression) => Step[]);

    constructor(
        type: Type | string,
        steps: Step[] | ((expr: InternalExpression) => Step[]),
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
        return Purpose.Hidden;
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
        const steps =
            typeof this.steps === 'function' ? this.steps(this) : this.steps;
        return steps.length === 0
            ? [new StartFinish(this)]
            : [new Start(this), ...steps, new Finish(this)];
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

    static readonly LocalePath = (l: LocaleText) => l.node.InternalExpression;
    getLocalePath() {
        return InternalExpression.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.InternalExpression.start);
    }

    getCharacter() {
        return Characters.Basis;
    }
}
