import type PropertyBind from '@nodes/PropertyBind';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import Evaluate from '@nodes/Evaluate';
import type UnaryEvaluate from '@nodes/UnaryEvaluate';
import type Value from '@values/Value';
import Step from '@runtime/Step';

type Eval = BinaryEvaluate | UnaryEvaluate | Evaluate | PropertyBind;

export default class StartEvaluation extends Step {
    readonly evaluable: Eval;
    /** True if this call is in tail position within its enclosing function,
     *  so its evaluation may replace the function's frames instead of growing
     *  the stack. Only Evaluate calls are ever marked. */
    readonly tail: boolean;

    constructor(node: Eval, tail = false) {
        super(node);
        this.evaluable = node;
        this.tail = tail;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.tail && this.evaluable instanceof Evaluate
            ? this.evaluable.startEvaluation(evaluator, true)
            : this.evaluable.startEvaluation(evaluator);
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Evaluate.evaluate);
    }
}
