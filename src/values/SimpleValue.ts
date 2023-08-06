import type Evaluator from '@runtime/Evaluator';
import FunctionValue from '@values/FunctionValue';
import Value from '@values/Value';

export default abstract class SimpleValue extends Value {
    resolve(name: string, evaluator: Evaluator): Value | undefined {
        const fun = evaluator
            ?.getBasis()
            .getFunction(this.getBasisTypeName(), name);
        if (fun !== undefined) return new FunctionValue(fun, this);
    }
}
