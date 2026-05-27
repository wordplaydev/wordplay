import type Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type Value from '@values/Value';
import { finish } from '@runtime/Finish';
import { start } from '@runtime/Start';
import Step from '@runtime/Step';

export default class StartFinish extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        start(evaluator, this.node);
        return finish(evaluator, this.node);
    }

    getExplanations(locales: Locales, evaluator: Evaluator) {
        return this.node.getStartExplanations(
            locales,
            evaluator.project.getNodeContext(this.node),
            evaluator,
        );
    }
}
