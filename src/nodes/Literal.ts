import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import SimpleExpression from './SimpleExpression';
import type Expression from './Expression';
import Purpose from '../concepts/Purpose';
import type Context from './Context';
import type Locales from '../locale/Locales';

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

    getPurpose() {
        return Purpose.Value;
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return this.getValue(evaluator.locales);
    }

    abstract getValue(locales: Locales): Value;
}
