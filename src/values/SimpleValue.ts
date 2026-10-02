import type Evaluator from '#runtime/Evaluator.ts';
import FunctionValue from '#values/FunctionValue.ts';
import Value from '#values/Value.ts';
import { StructureTypeName } from '#basis/BasisConstants.ts';

export default abstract class SimpleValue extends Value {
    resolve(name: string, evaluator: Evaluator): Value | undefined {
        const basis = evaluator.getBasis();
        const fun =
            basis.getFunction(this.getBasisTypeName(), name) ??
            basis.getFunction(StructureTypeName, name);
        if (fun !== undefined) return new FunctionValue(fun, this);
    }
}
