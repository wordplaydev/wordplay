import Step from './Step';
import type Evaluator from './Evaluator';
import type Value from './Value';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';
import type Evaluate from '../nodes/Evaluate';
import type UnaryEvaluate from '../nodes/UnaryEvaluate';
import type BinaryEvaluate from '../nodes/BinaryEvaluate';

type Eval = BinaryEvaluate | UnaryEvaluate | Evaluate;

export default class StartEvaluation extends Step {
    readonly evaluable: Eval;

    constructor(node: Eval) {
        super(node);
        this.evaluable = node;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.evaluable.startEvaluation(evaluator);
    }

    getExplanations(locale: Locale) {
        return concretize(locale, locale.node.Evaluate.evaluate);
    }
}
