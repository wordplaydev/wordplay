import type { StructureDefinitionInterface } from "../native/StructureDefinitionInterface";

export default abstract class Value {

    constructor() {}

    /** Returns a Wordplay sytnax representation of the value. */
    abstract toString(): string;

    /** Returns the Structure defining this value's interface. */
    abstract getType(): StructureDefinitionInterface;

    isEqualTo(value: Value): boolean {
        return this.toString() === value.toString();
    }

}