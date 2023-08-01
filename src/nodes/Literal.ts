import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import AtomicExpression from './AtomicExpression';
import type Expression from './Expression';
import Purpose from '../concepts/Purpose';
import type Locale from '../locale/Locale';

export default abstract class Literal extends AtomicExpression {
    constructor() {
        super();
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    getPurpose() {
        return Purpose.Value;
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return this.getValue(evaluator.project.locales);
    }

    abstract getValue(locales: Locale[]): Value;
}
