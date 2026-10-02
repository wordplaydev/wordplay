import type Expression from '#nodes/Expression.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import type ExceptionValue from '#values/ExceptionValue.ts';
import type Locales from '#locale/Locales.ts';
import type Value from '#values/Value.ts';
import Step from '#runtime/Step.ts';

export default class Halt extends Step {
    readonly exception: (evaluator: Evaluator) => ExceptionValue;

    constructor(
        exception: (evaluator: Evaluator) => ExceptionValue,
        node: Expression,
    ) {
        super(node);

        this.exception = exception;
    }

    evaluate(evaluator: Evaluator): Value {
        return this.exception(evaluator);
    }

    getExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Program.halt);
    }
}
