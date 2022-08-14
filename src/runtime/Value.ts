import type Type from "../nodes/Type";
import type Evaluator from "./Evaluator";

export default abstract class Value {

    constructor() {}

    /** Returns a Wordplay sytnax representation of the value. */
    abstract toString(): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(): Type;
   
    abstract getNativeTypeName(): string;

    /** Returns the value with the given name in the structure. By default, check's native functions. */
    resolve(name: string, evaluator: Evaluator): Value | undefined { return undefined; }

    isEqualTo(value: Value): boolean {
        return this.toString() === value.toString();
    }

}