import type Context from "../nodes/Context";
import type Type from "../nodes/Type";
import type Evaluator from "./Evaluator";

export default abstract class Value {

    constructor() {}

    /** Returns a Wordplay sytnax representation of the value. */
    abstract toString(): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(context: Context): Type;
   
    abstract getNativeTypeName(): string;

    /** Returns the value with the given name in the structure. */
    abstract resolve(name: string, evaluator: Evaluator): Value | undefined;

    abstract isEqualTo(value: Value): boolean;

}