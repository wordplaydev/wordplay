import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import Step from './Step';
import type Value from '../values/Value';
import type Locales from '../locale/Locales';

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
