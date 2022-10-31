import type Context from "../nodes/Context";
import type Type from "../nodes/Type";
import type Evaluator from "./Evaluator";
import type Node from "../nodes/Node";

/** Used to uniquely distinguish values. */
let VALUE_ID = 0;

export default abstract class Value {

    readonly id = VALUE_ID++;
    readonly creator: Node;

    constructor(creator: Node) { 
        this.creator = creator;
    }

    /** Returns a Wordplay sytnax representation of the value. */
    abstract toString(): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(context: Context): Type;
   
    abstract getNativeTypeName(): string;

    /** Returns the value with the given name in the structure. */
    abstract resolve(name: string, evaluator: Evaluator): Value | undefined;

    abstract isEqualTo(value: Value): boolean;

}