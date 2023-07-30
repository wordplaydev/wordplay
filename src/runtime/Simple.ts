import type Evaluator from './Evaluator';
import FunctionValue from './FunctionValue';
import Value from './Value';

export default abstract class Simple extends Value {
    resolve(name: string, evaluator: Evaluator): Value | undefined {
        const fun = evaluator
            ?.getBasis()
            .getFunction(this.getBasisTypeName(), name);
        if (fun !== undefined) return new FunctionValue(fun, this);
    }
}
