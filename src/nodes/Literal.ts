import type Locale from '#locale/Locale.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import StartFinish from '#runtime/StartFinish.ts';
import type Step from '#runtime/Step.ts';
import type Value from '#values/Value.ts';
import type Context from '#nodes/Context.ts';
import type Expression from '#nodes/Expression.ts';
import SimpleExpression from '#nodes/SimpleExpression.ts';

export default abstract class Literal extends SimpleExpression {
    constructor() {
        super();
    }

    getDependencies(): Expression[] {
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    compile(__: Evaluator, _: Context): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return this.getValue(evaluator.getLocaleIDs());
    }

    abstract getValue(locales: Locale[]): Value;
}
