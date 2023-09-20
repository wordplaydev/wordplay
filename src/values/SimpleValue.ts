import type Evaluator from '@runtime/Evaluator';
import FunctionValue from '@values/FunctionValue';
import Value from '@values/Value';
import { StructureTypeName } from '../basis/BasisConstants';

export default abstract class SimpleValue extends Value {
    resolve(name: string, evaluator: Evaluator): Value | undefined {
        const basis = evaluator.getBasis();
        const fun =
            basis.getFunction(this.getBasisTypeName(), name) ??
            basis.getFunction(StructureTypeName, name);
        if (fun !== undefined) return new FunctionValue(fun, this);
    }
}
