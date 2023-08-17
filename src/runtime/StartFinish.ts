import Step from './Step';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type Expression from '@nodes/Expression';
import { finish } from './Finish';
import { start } from './Start';
import type Locale from '@locale/Locale';

export default class StartFinish extends Step {
    constructor(node: Expression) {
        super(node);
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        start(evaluator, this.node);
        return finish(evaluator, this.node);
    }

    getExplanations(translation: Locale, evaluator: Evaluator) {
        return this.node.getStartExplanations(
            translation,
            evaluator.project.getNodeContext(this.node),
            evaluator
        );
    }
}
