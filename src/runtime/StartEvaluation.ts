import type PropertyBind from '#nodes/PropertyBind.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Locales from '#locale/Locales.ts';
import type BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Evaluate from '#nodes/Evaluate.ts';
import type UnaryEvaluate from '#nodes/UnaryEvaluate.ts';
import type Value from '#values/Value.ts';
import Step from '#runtime/Step.ts';

type Eval = BinaryEvaluate | UnaryEvaluate | Evaluate | PropertyBind;

export default class StartEvaluation extends Step {
    readonly evaluable: Eval;
    /** True if this call is in tail position within its enclosing function,
     *  so its evaluation may replace the function's frames instead of growing
     *  the stack. Only Evaluate calls are ever marked. */
    readonly tail: boolean;
    /** How many values the compiled inputs push, when that can't be read off the
     *  definition at runtime — a call through a written-down function type compiles
     *  against the type's binds, and the function it is handed may declare fewer. */
    readonly count: number | undefined;

    constructor(node: Eval, tail = false, count?: number) {
        super(node);
        this.evaluable = node;
        this.tail = tail;
        this.count = count;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        return this.evaluable instanceof Evaluate
            ? this.evaluable.startEvaluation(evaluator, this.tail, this.count)
            : this.evaluable.startEvaluation(evaluator);
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Evaluate.evaluate);
    }
}
