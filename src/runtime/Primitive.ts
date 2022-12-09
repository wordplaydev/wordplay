import type Evaluator from "./Evaluator";
import FunctionValue from "./FunctionValue";
import Value from "./Value";

export default abstract class Primitive extends Value {

    resolve(name: string, evaluator: Evaluator): Value | undefined { 

        const fun = evaluator?.getNative().getFunction(this.getNativeTypeName(), name);
        if(fun !== undefined) return new FunctionValue(fun, this);

    }

}