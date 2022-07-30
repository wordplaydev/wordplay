import type Type from "../nodes/Type";

export default abstract class Value {

    constructor() {}

    /** Returns a Wordplay sytnax representation of the value. */
    abstract toString(): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(): Type;

    isEqualTo(value: Value): boolean {
        return this.toString() === value.toString();
    }

}