import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type Locales from '#locale/Locales.ts';
import type Value from '#values/Value.ts';
import { finish } from '#runtime/Finish.ts';
import { start } from '#runtime/Start.ts';
import Step from '#runtime/Step.ts';

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
