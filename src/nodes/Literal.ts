import type Locale from '@locale/Locale';
import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import SimpleExpression from '@nodes/SimpleExpression';

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
