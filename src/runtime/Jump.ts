import type Expression from '../nodes/Expression';
import type Translation from '../translation/Translation';
import type Evaluator from './Evaluator';
import Step from './Step';
import type Value from './Value';

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

    getExplanations(translation: Translation) {
        return translation.step.jump;
    }
}
