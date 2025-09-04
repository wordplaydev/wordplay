import type PropertyBind from '@nodes/PropertyBind';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '../locale/Locales';
import type BinaryEvaluate from '../nodes/BinaryEvaluate';
import type Evaluate from '../nodes/Evaluate';
import type UnaryEvaluate from '../nodes/UnaryEvaluate';
import type Value from '../values/Value';
import Step from './Step';

type Eval = BinaryEvaluate | UnaryEvaluate | Evaluate | PropertyBind;

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
        return locales.concretize((l) => l.node.Evaluate.evaluate);
    }
}
