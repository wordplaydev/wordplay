import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Locales from '#locale/Locales.ts';
import type Value from '#values/Value.ts';
import Step from '#runtime/Step.ts';

export default class Jump extends Step {
    readonly count: number;

    constructor(count: number, node: Expression) {
        super(node);

        this.count = count;
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        evaluator.jump(this.count);
        return undefined;
    }

    toString() {
        return super.toString() + ' ' + this.count;
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Conditional.afterthen);
    }
}
