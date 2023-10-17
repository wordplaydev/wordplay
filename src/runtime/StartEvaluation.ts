import Step from './Step';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import concretize from '../locale/concretize';
import type Evaluate from '../nodes/Evaluate';
import type UnaryEvaluate from '../nodes/UnaryEvaluate';
import type BinaryEvaluate from '../nodes/BinaryEvaluate';
import type Locales from '../locale/Locales';

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

    getExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.Evaluate.evaluate)
        );
    }
}
